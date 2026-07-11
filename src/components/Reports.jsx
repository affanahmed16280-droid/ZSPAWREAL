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
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

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

export default function Reports() {
  const [period, setPeriod] = useState('day');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { totalOrders, totalRevenue, pendingOrders, completedOrders, brandStats, coatingStats, typeStats, loading } = useStats(period);

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
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('ZS Trading', 14, y);
      y += 10;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Sales Report — ${periodLabel}`, 14, y);
      y += 7;

      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Period: ${dateRange}`, 14, y);
      y += 4;
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 14, y);
      doc.setTextColor(0);
      y += 12;

      // Summary table
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, y);
      y += 2;

      doc.autoTable({
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Orders', String(totalOrders)],
          ['Total Revenue', formatCurrency(totalRevenue)],
          ['Completed Orders', String(completedOrders)],
          ['Pending Orders', String(pendingOrders)],
          ['Average Order Value', formatCurrency(avgOrderValue)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], fontSize: 11 },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 14;

      // Brand breakdown
      if (brandStats && brandStats.length > 0) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Lens Brand Breakdown', 14, y);
        y += 2;

        doc.autoTable({
          startY: y,
          head: [['Brand', 'Orders', 'Revenue']],
          body: brandStats.map((b) => [b.brand, String(b.count), formatCurrency(b.revenue)]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], fontSize: 11 },
          styles: { fontSize: 10 },
          margin: { left: 14, right: 14 },
        });

        y = doc.lastAutoTable.finalY + 14;
      }

      // Coating breakdown
      if (coatingStats && coatingStats.length > 0) {
        // Check if we need a new page
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Coating Distribution', 14, y);
        y += 2;

        doc.autoTable({
          startY: y,
          head: [['Coating', 'Orders', 'Revenue']],
          body: coatingStats.map((c) => [c.coating, String(c.count), formatCurrency(c.revenue)]),
          theme: 'striped',
          headStyles: { fillColor: [245, 158, 11], fontSize: 11 },
          styles: { fontSize: 10 },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
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
      const fileName = `ZS_Trading_Report_${periodLabel.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <HiChartBar className="text-brand-400" />
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
          <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
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
                bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                hover:from-violet-500 hover:to-indigo-500
                transition-all duration-200 active:scale-[0.97]
                disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]
                shadow-lg shadow-violet-500/20"
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
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                  <HiCurrencyDollar className="text-white text-xl" />
                </div>
                <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Total Revenue</span>
              </div>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
                {formatCurrency(totalRevenue)}
              </p>
              {avgOrderValue > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <HiTrendingUp className="text-emerald-400 text-sm" />
                  <span className="text-xs text-emerald-400 font-medium">
                    {formatCurrency(avgOrderValue)} avg per order
                  </span>
                </div>
              )}
            </div>

            {/* Total Orders */}
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-2">
                <HiShoppingCart className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{totalOrders}</p>
              <p className="text-xs text-white/40 mt-0.5">Total Orders</p>
            </div>

            {/* Completed Orders */}
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-2">
                <HiCheckCircle className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{completedOrders}</p>
              <p className="text-xs text-white/40 mt-0.5">Completed</p>
            </div>

            {/* Pending Orders */}
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-2">
                <HiClock className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{pendingOrders}</p>
              <p className="text-xs text-white/40 mt-0.5">Pending</p>
            </div>

            {/* Avg Order Value */}
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-2">
                <HiTrendingUp className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(avgOrderValue)}</p>
              <p className="text-xs text-white/40 mt-0.5">Avg Value</p>
            </div>
          </div>

          {/* Order Types Breakdown */}
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
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
                        <span className="text-xs font-semibold text-brand-400">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700 ease-out"
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
              <span className="w-2 h-2 rounded-full bg-brand-500" />
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
                        <span className="text-xs font-semibold text-brand-400">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-700 ease-out"
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
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
                        <span className="text-xs font-semibold text-emerald-400">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700 ease-out"
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
