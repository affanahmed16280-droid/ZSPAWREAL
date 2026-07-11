import React, { useState, useMemo } from 'react';
import {
  HiChartBar,
  HiCurrencyDollar,
  HiShoppingCart,
  HiCheckCircle,
  HiClock,
  HiTrendingUp,
  HiDownload,
} from 'react-icons/hi';
import { useStats } from '../hooks/useStats';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PERIODS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

function getPeriodLabel(period) {
  const labels = { day: 'Today', week: 'This Week', month: 'This Month' };
  return labels[period] || period;
}

function getPeriodDateRange(period) {
  const now = new Date();
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  const endStr = now.toLocaleDateString('en-US', options);

  if (period === 'day') {
    return endStr;
  }
  if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return `${weekStart.toLocaleDateString('en-US', options)} – ${endStr}`;
  }
  if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return `${monthStart.toLocaleDateString('en-US', options)} – ${endStr}`;
  }
  return endStr;
}

function getOrderCategory(order) {
  const type = order.orderType || 'prescription';
  const labels = {
    prescription: 'Powered Glasses',
    sunglasses: 'Sunglasses',
    contact_lenses: 'Contact Lenses',
    servicing: 'Servicing / Frame',
  };
  return labels[type] || type;
}

export default function Reports() {
  const [period, setPeriod] = useState('day');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { totalOrders, totalRevenue, pendingOrders, completedOrders, brandStats, coatingStats, typeStats, orders, loading } = useStats(period);

  const avgOrderValue = useMemo(() => {
    if (!totalOrders || totalOrders === 0) return 0;
    return Math.round(totalRevenue / totalOrders);
  }, [totalRevenue, totalOrders]);

  const maxTypeCount = useMemo(() => {
    if (!typeStats || typeStats.length === 0) return 1;
    return Math.max(...typeStats.map((t) => t.count), 1);
  }, [typeStats]);

  const maxBrandCount = useMemo(() => {
    if (!brandStats || brandStats.length === 0) return 1;
    return Math.max(...brandStats.map((b) => b.count), 1);
  }, [brandStats]);

  const maxCoatingCount = useMemo(() => {
    if (!coatingStats || coatingStats.length === 0) return 1;
    return Math.max(...coatingStats.map((c) => c.count), 1);
  }, [coatingStats]);

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const periodLabel = getPeriodLabel(period);
      const dateRange = getPeriodDateRange(period);
      let y = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ZS Trading — Sales Report', 14, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Period: ${periodLabel} (${dateRange})`, 14, y);
      y += 5;
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 14, y);
      doc.setTextColor(0);
      y += 5;

      // Thin separator line
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      // Build the spreadsheet rows from raw orders
      const tableRows = (orders || [])
        .sort((a, b) => {
          const dateA = a.orderDate?.toDate ? a.orderDate.toDate() : new Date(a.orderDate);
          const dateB = b.orderDate?.toDate ? b.orderDate.toDate() : new Date(b.orderDate);
          return dateA - dateB;
        })
        .map((order, idx) => {
          const date = order.orderDate?.toDate ? order.orderDate.toDate() : new Date(order.orderDate);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const category = getOrderCategory(order);
          const amount = formatCurrency(order.totalAmount);
          return [String(idx + 1), dateStr, category, amount];
        });

      // Sales spreadsheet table
      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Category', 'Amount (৳)']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 30, 30],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [40, 40, 40],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 40 },
          2: { halign: 'left' },
          3: { halign: 'right', cellWidth: 35 },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        styles: {
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          cellPadding: 3,
        },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 8;

      // Summary row at the bottom
      doc.setDrawColor(30);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageWidth - 14, y);
      y += 6;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Orders: ${totalOrders}`, 14, y);
      doc.text(`Total: ${formatCurrency(totalRevenue)}`, pageWidth - 14, y, { align: 'right' });

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `ZS Trading — Sales Report | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' },
        );
      }

      // Save
      const fileName = `ZS_Trading_Sales_${periodLabel.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success('PDF downloaded!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <HiChartBar className="text-white" />
          Sales Reports
        </h1>
        <p className="text-sm text-white/40 mt-1">Track your shop's performance</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '50ms' }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`chip flex-1 text-center min-h-[44px] ${
              period === p.key ? 'chip-active' : 'chip-inactive'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Download PDF Button */}
          <div className="animate-fade-in" style={{ animationDelay: '75ms' }}>
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf || totalOrders === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold
                bg-gradient-to-b from-brand-700 to-brand-900 border border-brand-600 text-white
                hover:from-brand-600 hover:to-brand-800
                transition-all duration-200 active:scale-[0.97]
                disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]
                shadow-lg shadow-black/50"
            >
              {generatingPdf ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <HiDownload className="text-lg" />
                  Download PDF Report
                </>
              )}
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {/* Total Revenue - Full Width Highlight */}
            <div className="col-span-2 glass-card p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <HiCurrencyDollar className="text-white text-xl" />
                </div>
                <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Total Revenue</span>
              </div>
              <p className="text-3xl font-extrabold text-white">
                {formatCurrency(totalRevenue)}
              </p>
              {avgOrderValue > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <HiTrendingUp className="text-white/60 text-sm" />
                  <span className="text-xs text-white/60 font-medium">
                    {formatCurrency(avgOrderValue)} avg per order
                  </span>
                </div>
              )}
            </div>

            {/* Total Orders */}
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                <HiShoppingCart className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{totalOrders}</p>
              <p className="text-xs text-white/40 mt-0.5">Total Orders</p>
            </div>

            {/* Completed Orders */}
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                <HiCheckCircle className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{completedOrders}</p>
              <p className="text-xs text-white/40 mt-0.5">Completed</p>
            </div>

            {/* Pending Orders */}
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                <HiClock className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{pendingOrders}</p>
              <p className="text-xs text-white/40 mt-0.5">Pending</p>
            </div>

            {/* Avg Order Value */}
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                <HiTrendingUp className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(avgOrderValue)}</p>
              <p className="text-xs text-white/40 mt-0.5">Avg Value</p>
            </div>
          </div>

          {/* Order Types Breakdown */}
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              Order Types Breakdown
            </h3>

            {(!typeStats || typeStats.length === 0) ? (
              <div className="text-center py-6">
                <HiShoppingCart className="text-3xl text-white/15 mx-auto mb-2" />
                <p className="text-sm text-white/30">No orders in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {typeStats.map((item, idx) => (
                  <div key={item.type} className="animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white uppercase tracking-wider">{item.type.replace('_', ' ')}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">{item.count} orders</span>
                        <span className="text-xs font-semibold text-white">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.round((item.count / maxTypeCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lens Brand Breakdown */}
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white/60" />
              Popular Lens Brands (Prescriptions)
            </h3>

            {(!brandStats || brandStats.length === 0) ? (
              <div className="text-center py-6">
                <HiShoppingCart className="text-3xl text-white/15 mx-auto mb-2" />
                <p className="text-sm text-white/30">No orders in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {brandStats.map((item, idx) => (
                  <div key={item.brand} className="animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white">{item.brand}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">{item.count} orders</span>
                        <span className="text-xs font-semibold text-white">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/70 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.round((item.count / maxBrandCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coating Breakdown */}
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white/40" />
              Coating Distribution
            </h3>

            {(!coatingStats || coatingStats.length === 0) ? (
              <div className="text-center py-6">
                <HiShoppingCart className="text-3xl text-white/15 mx-auto mb-2" />
                <p className="text-sm text-white/30">No orders in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coatingStats.map((item, idx) => (
                  <div key={item.coating} className="animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white">{item.coating}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">{item.count} orders</span>
                        <span className="text-xs font-semibold text-white">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/50 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.round((item.count / maxCoatingCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
