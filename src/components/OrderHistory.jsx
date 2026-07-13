import React, { useState, useMemo } from 'react';
import {
  HiClipboardList,
  HiClock,
  HiCheckCircle,
  HiShoppingCart,
  HiBan,
} from 'react-icons/hi';
import { useOrders } from '../hooks/useOrders';
import { updateOrderStatus } from '../firebase/config';
import OrderCard from './OrderCard';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../utils/helpers';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Processing', label: 'Processing' },
  { key: 'Ready for Pickup', label: 'Ready' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Cancelled', label: 'Cancelled' },
];

export default function OrderHistory() {
  const { orders, loading, error } = useOrders();
  const [filter, setFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const handleStatusToggle = async (orderId, newStatus) => {
    try {
      // The update is already done in OrderCard via Firebase, but we catch it here just in case.
      // Wait, OrderCard calls updateOrderStatus AND onStatusToggle. So we don't need to call updateOrderStatus here again if OrderCard did it, but OrderCard DOES call it.
      // Let's remove updateOrderStatus from here and let OrderHistory just react, or keep it if OrderHistory is the single source of truth. Actually OrderCard handles DB update. OrderHistory's onStatusToggle is just an event.
      // Wait, in previous code:
      // await updateOrderStatus(orderId, newStatus);
      // Let's keep it but actually OrderCard does the update. To avoid double writing, we just rely on useOrders hook updating the state! 
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleDownloadInvoices = () => {
    if (!customStart || !customEnd) {
      toast.error('Please select both start and end dates');
      return;
    }
    setGeneratingPdf(true);
    try {
      const startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);

      const filtered = (orders || []).filter((o) => {
        const orderDate = o.orderDate?.toDate ? o.orderDate.toDate() : new Date(o.orderDate);
        return orderDate >= startDate && orderDate <= endDate && o.status !== 'Cancelled';
      });

      if (filtered.length === 0) {
        toast.error('No valid orders found in this date range');
        setGeneratingPdf(false);
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const dateRangeStr = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      let y = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ZS Trading — Invoice Report', 14, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Period: ${dateRangeStr}`, 14, y);
      y += 5;
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 14, y);
      doc.setTextColor(0);
      y += 5;

      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      let totalRevenue = 0;
      const tableRows = filtered
        .sort((a, b) => {
          const dateA = a.orderDate?.toDate ? a.orderDate.toDate() : new Date(a.orderDate);
          const dateB = b.orderDate?.toDate ? b.orderDate.toDate() : new Date(b.orderDate);
          return dateA - dateB;
        })
        .map((order, idx) => {
          const date = order.orderDate?.toDate ? order.orderDate.toDate() : new Date(order.orderDate);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const category = order.orderType ? order.orderType.replace('_', ' ').toUpperCase() : 'PRESCRIPTION';
          const amount = formatCurrency(order.totalAmount).replace('৳', 'Tk ');
          totalRevenue += Number(order.totalAmount || 0);
          return [String(idx + 1), dateStr, order.customerName || 'Walk-in', category, amount];
        });

      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Customer', 'Category', 'Amount (Tk)']],
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
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 28 },
          2: { halign: 'left' },
          3: { halign: 'left', cellWidth: 35 },
          4: { halign: 'right', cellWidth: 30 },
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

      doc.setDrawColor(30);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageWidth - 14, y);
      y += 6;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Invoices: ${filtered.length}`, 14, y);
      doc.text(`Total Amount: ${formatCurrency(totalRevenue).replace('৳', 'Tk ')}`, pageWidth - 14, y, { align: 'right' });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `ZS Trading — Invoice Report | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' },
        );
      }

      const fileName = `ZS_Invoices_${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success('Invoices PDF downloaded!');
      setShowInvoiceModal(false);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <HiClipboardList className="text-brand-400" />
            Order History
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {orders ? orders.length : 0} total orders
          </p>
        </div>
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl text-xs font-bold hover:bg-brand-500/20 transition-all active:scale-95"
        >
          Export Invoices
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 animate-fade-in overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar" style={{ animationDelay: '50ms' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`chip flex-shrink-0 text-center min-h-[44px] px-4 flex items-center justify-center gap-1.5 ${
              filter === f.key ? 'chip-active' : 'chip-inactive'
            }`}
          >
            {f.key === 'Pending' && <HiClock className="text-sm" />}
            {f.key === 'Processing' && <HiClock className="text-sm" />}
            {f.key === 'Ready for Pickup' && <HiCheckCircle className="text-sm" />}
            {f.key === 'Delivered' && <HiCheckCircle className="text-sm" />}
            {f.key === 'Cancelled' && <HiBan className="text-sm" />}
            {f.label}
            {filter === f.key && orders && (
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full ml-1">
                {filteredOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-5 text-center">
          <p className="text-red-400 text-sm">Failed to load orders. Please try again.</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredOrders.length === 0 && (
        <div className="glass-card p-10 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <HiShoppingCart className="text-3xl text-white/20" />
          </div>
          <p className="text-white/40 text-sm font-medium">
            {filter === 'all'
              ? 'No orders yet. Create your first order!'
              : `No ${filter.toLowerCase()} orders found`}
          </p>
        </div>
      )}

      {/* Order List */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map((order, idx) => (
            <div
              key={order.id}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
            >
              <OrderCard order={order} onStatusToggle={handleStatusToggle} />
            </div>
          ))}
        </div>
      )}

      {/* Invoice Export Modal */}
      {showInvoiceModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            className="w-[90%] max-w-sm bg-surface-900 rounded-2xl border border-white/10 p-6 space-y-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HiClipboardList className="text-brand-400" />
              Export Invoices
            </h3>
            <p className="text-xs text-white/40">Select a date range to generate a PDF report of all invoices within that period.</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-1 block">From Date</label>
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)} 
                  className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]" 
                />
              </div>
              <div>
                <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-1 block">To Date</label>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)} 
                  className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]" 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadInvoices}
                disabled={generatingPdf || !customStart || !customEnd}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-500 hover:to-brand-300 transition-all duration-200 active:scale-95 disabled:opacity-40"
              >
                {generatingPdf ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
