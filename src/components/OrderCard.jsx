import React, { useState } from 'react';
import {
  HiCurrencyDollar,
  HiPhone,
  HiCheckCircle,
  HiClock,
  HiX,
  HiTrash,
  HiBan,
  HiLockClosed,
} from 'react-icons/hi';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import { updateOrderStatus, deleteOrder } from '../firebase/config';
import toast from 'react-hot-toast';
import { HiCog, HiTruck, HiChat, HiDownload, HiMail } from 'react-icons/hi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DELETE_PIN = '62376';

const statusConfig = {
  Pending: {
    bg: 'bg-accent-gold/15',
    text: 'text-accent-gold',
    border: 'border-accent-gold/30',
    icon: HiClock,
  },
  Processing: {
    bg: 'bg-brand-500/15',
    text: 'text-brand-400',
    border: 'border-brand-500/30',
    icon: HiCog,
  },
  'Ready for Pickup': {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: HiTruck,
  },
  Delivered: {
    bg: 'bg-accent-champagne/15',
    text: 'text-accent-champagne',
    border: 'border-accent-champagne/30',
    icon: HiCheckCircle,
  },
  Completed: { // Legacy support
    bg: 'bg-accent-champagne/15',
    text: 'text-accent-champagne',
    border: 'border-accent-champagne/30',
    icon: HiCheckCircle,
  },
  Cancelled: {
    bg: 'bg-surface-700',
    text: 'text-white/40',
    border: 'border-white/10',
    icon: HiBan,
  },
};

export default function OrderCard({ order, onStatusToggle, onDelete }) {
  const config = statusConfig[order.status] || statusConfig.Pending;
  const StatusIcon = config.icon;

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState(null); // 'delete' | 'cancel'
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleToggle = async () => {
    if (order.status === 'Cancelled') return;
    
    let newStatus = 'Processing';
    if (order.status === 'Pending') newStatus = 'Processing';
    else if (order.status === 'Processing') newStatus = 'Ready for Pickup';
    else if (order.status === 'Ready for Pickup') newStatus = 'Delivered';
    else if (order.status === 'Delivered' || order.status === 'Completed') newStatus = 'Pending';

    try {
      await updateOrderStatus(order.id, newStatus);
      if (onStatusToggle) {
        onStatusToggle(order.id, newStatus);
      }
      toast.success(`Order #${order.orderSequenceId} → ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleCancelClick = () => {
    if (order.status === 'Cancelled') return;
    setPinAction('cancel');
    setShowPinModal(true);
    setPin('');
    setPinError('');
  };

  const executeCancel = async () => {
    setIsProcessingAction(true);
    try {
      await updateOrderStatus(order.id, 'Cancelled');
      if (onStatusToggle) {
        onStatusToggle(order.id, 'Cancelled');
      }
      toast.success(`Order #${order.orderSequenceId} cancelled`);
      setShowPinModal(false);
    } catch (err) {
      toast.error('Failed to cancel order');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteClick = () => {
    setPinAction('delete');
    setShowPinModal(true);
    setPin('');
    setPinError('');
  };

  const handlePinConfirm = async () => {
    if (pin !== DELETE_PIN) {
      setPinError('Incorrect PIN');
      return;
    }
    
    if (pinAction === 'cancel') {
      await executeCancel();
    } else if (pinAction === 'delete') {
      setIsProcessingAction(true);
      try {
        await deleteOrder(order.id);
        if (onDelete) {
          onDelete(order.id);
        }
        toast.success(`Order #${order.orderSequenceId} deleted permanently`);
        setShowPinModal(false);
      } catch (err) {
        toast.error('Failed to delete order');
      } finally {
        setIsProcessingAction(false);
      }
    }
  };

  return (
    <>
      <div className="glass-card-light p-4 animate-fade-in">
        {/* Top Row: Order ID + Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-accent-gold tracking-wide">
              Order #{order.orderSequenceId}
            </h3>
            {order.orderType && order.orderType !== 'prescription' && (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-md">
                {order.orderType.replace('_', ' ')}
              </span>
            )}
          </div>
          <button
            onClick={handleToggle}
            disabled={order.status === 'Cancelled'}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
              border transition-all duration-200 active:scale-95 min-h-[32px]
              ${config.bg} ${config.text} ${config.border}
              ${order.status === 'Cancelled' ? 'cursor-default' : ''}
            `}
          >
            <StatusIcon className="text-sm" />
            {order.status}
          </button>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
          <HiPhone className="text-sm flex-shrink-0" />
          <span>{order.customerName || 'Unknown'}</span>
          <span className="text-white/30">·</span>
          <span>{order.customerPhone}</span>
        </div>

        {/* Order Details based on Type */}
        <div className="flex items-center gap-2 flex-wrap mb-3 text-xs text-white/50">
          {(!order.orderType || order.orderType === 'prescription') && (
            <>
              {order.lensBrand && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{order.lensBrand}</span>}
              {order.lensCoating && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{order.lensCoating}</span>}
              {order.frameDetails && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 truncate max-w-[150px]">{order.frameDetails}</span>}
              {order.pd && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 font-mono text-[10px]">PD: {order.pd}</span>}
              
              {/* Lens Powers Details */}
              {(order.sphRight || order.cylRight || order.axisRight || order.addRight || order.sphLeft || order.cylLeft || order.axisLeft || order.addLeft) && (
                <div className="w-full mt-2 bg-black/20 rounded-lg border border-white/5 p-2">
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-x-2 gap-y-1 text-[10px] font-mono text-white/70">
                    <div className="font-semibold text-white/40 border-b border-white/5 pb-1">EYE</div>
                    <div className="font-semibold text-white/40 border-b border-white/5 pb-1 text-center">SPH</div>
                    <div className="font-semibold text-white/40 border-b border-white/5 pb-1 text-center">CYL</div>
                    <div className="font-semibold text-white/40 border-b border-white/5 pb-1 text-center">AXIS</div>
                    <div className="font-semibold text-white/40 border-b border-white/5 pb-1 text-center">ADD</div>
                    
                    <div className="font-bold text-white/90">R (OD)</div>
                    <div className="text-center">{order.sphRight || '-'}</div>
                    <div className="text-center">{order.cylRight || '-'}</div>
                    <div className="text-center">{order.axisRight || '-'}</div>
                    <div className="text-center">{order.addRight || '-'}</div>
                    
                    <div className="font-bold text-white/90">L (OS)</div>
                    <div className="text-center">{order.sphLeft || '-'}</div>
                    <div className="text-center">{order.cylLeft || '-'}</div>
                    <div className="text-center">{order.axisLeft || '-'}</div>
                    <div className="text-center">{order.addLeft || '-'}</div>
                  </div>
                </div>
              )}
              
              {/* Lens Note */}
              {order.lensNote && (
                <div className="w-full mt-2 p-2 bg-accent-gold/5 border border-accent-gold/20 rounded-lg text-accent-gold text-xs">
                  <strong>Note:</strong> {order.lensNote}
                </div>
              )}
            </>
          )}

          {order.orderType === 'sunglasses' && (
            <>
              {order.sunglassBrand && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{order.sunglassBrand}</span>}
              {order.sunglassModel && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{order.sunglassModel}</span>}
              {order.sunglassColor && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{order.sunglassColor}</span>}
            </>
          )}

          {order.orderType === 'contact_lenses' && (
            <>
              {order.contactBrand && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{order.contactBrand}</span>}
              {order.quantity && <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{order.quantity}</span>}
            </>
          )}

          {order.orderType === 'servicing' && order.serviceDescription && (
            <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 italic w-full">
              "{order.serviceDescription}"
            </span>
          )}

          {order.orderType === 'inquiry' && order.productDetails && (
            <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 w-full">
              <strong>Inquiry:</strong> {order.productDetails}
            </span>
          )}
        </div>

        {/* Bottom Row: Amount + Date */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-white">
            <HiCurrencyDollar className="text-accent-gold" />
            <span className="text-lg font-bold">{formatCurrency(order.totalAmount)}</span>
          </div>
          <span className="text-xs text-white/30 font-medium">
            {formatDateShort(order.orderDate)}
          </span>
        </div>

        {/* WhatsApp Ready for Pickup Notification */}
        {order.status === 'Ready for Pickup' && order.customerPhone && (
          <div className="mb-3 pt-2 border-t border-white/5">
            <a
              href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`hello,i am from zs trading your order is ready for pickup for further information contact 01791729128 or 01623761027`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
            >
              <HiChat className="text-base" />
              Notify Customer via WhatsApp
            </a>
          </div>
        )}

        {/* Bill Actions (Email & PDF) */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5 mb-3">
          <button
            onClick={() => {
              const doc = new jsPDF();
              const pageWidth = doc.internal.pageSize.getWidth();
              let y = 20;

              // Header
              doc.setFontSize(22);
              doc.setFont('helvetica', 'bold');
              doc.text('ZS Trading', pageWidth / 2, y, { align: 'center' });
              y += 8;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(100);
              doc.text('Phone: 01791729128 / 01623761027', pageWidth / 2, y, { align: 'center' });
              y += 10;
              
              doc.setDrawColor(200);
              doc.setLineWidth(0.3);
              doc.line(14, y, pageWidth - 14, y);
              y += 10;

              // Customer Info
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(0);
              doc.text('Customer Bill', 14, y);
              y += 8;
              
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.text(`Order ID: #${order.orderSequenceId}`, 14, y);
              doc.text(`Date: ${formatDateShort(order.orderDate)}`, pageWidth - 14, y, { align: 'right' });
              y += 6;
              doc.text(`Name: ${order.customerName || 'Walk-in'}`, 14, y);
              if (order.customerPhone) {
                y += 6;
                doc.text(`Phone: ${order.customerPhone}`, 14, y);
              }
              y += 10;

              // Order Details Table
              const category = order.orderType ? order.orderType.replace('_', ' ').toUpperCase() : 'PRESCRIPTION';
              let detailsStr = '';
              if (order.orderType === 'prescription' || !order.orderType) {
                detailsStr = [order.lensBrand, order.lensCoating, order.frameDetails].filter(Boolean).join(', ');
              } else if (order.orderType === 'sunglasses') {
                detailsStr = [order.sunglassBrand, order.sunglassModel, order.sunglassColor].filter(Boolean).join(', ');
              } else if (order.orderType === 'contact_lenses') {
                detailsStr = [order.contactBrand, order.quantity].filter(Boolean).join(', ');
              } else if (order.orderType === 'servicing') {
                detailsStr = order.serviceDescription || 'Servicing';
              } else if (order.orderType === 'inquiry') {
                detailsStr = order.productDetails || 'Inquiry';
              }

              autoTable(doc, {
                startY: y,
                head: [['Item / Description', 'Amount (Tk)']],
                body: [
                  [category + (detailsStr ? `\n${detailsStr}` : ''), formatCurrency(order.totalAmount).replace('৳', 'Tk ')]
                ],
                theme: 'grid',
                headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 5 },
                columnStyles: { 1: { halign: 'right', cellWidth: 40 } }
              });

              y = doc.lastAutoTable.finalY + 15;
              
              // Total
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text(`Total: ${formatCurrency(order.totalAmount).replace('৳', 'Tk ')}`, pageWidth - 14, y, { align: 'right' });
              y += 20;

              // Footer Message
              doc.setFontSize(12);
              doc.text('Thank you for choosing ZS Trading!', pageWidth / 2, y, { align: 'center' });

              doc.save(`ZS_Trading_Bill_${order.orderSequenceId}.pdf`);
              toast.success('Bill downloaded!');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 transition-all active:scale-95"
          >
            <HiDownload className="text-base" />
            Download Bill
          </button>
          
          <a
            href={`mailto:${order.customerEmail || ''}?subject=Your Bill from ZS Trading - Order #${order.orderSequenceId}&body=${encodeURIComponent(`Hello ${order.customerName || 'Valued Customer'},

Thank you for your purchase at ZS Trading!

--- ORDER DETAILS ---
Order ID: #${order.orderSequenceId}
Date: ${formatDateShort(order.orderDate)}
Total Amount: ${formatCurrency(order.totalAmount)}

We appreciate your business. If you have any questions, please contact us!

Best regards,
ZS Trading
Phone: 01791729128 / 01623761027`)}`}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95 ${order.customerEmail ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-white/30 border-white/10 opacity-50 cursor-not-allowed'}`}
            onClick={(e) => {
              if (!order.customerEmail) {
                e.preventDefault();
                toast.error('No email address saved for this customer');
              }
            }}
          >
            <HiMail className="text-base" />
            Email Bill
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          {order.status !== 'Cancelled' && (
            <button
              onClick={handleCancelClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                bg-white/5 text-white/50 border border-white/10
                hover:bg-white/10 transition-all duration-200 active:scale-95 min-h-[36px]"
            >
              <HiBan className="text-sm" />
              Cancel
            </button>
          )}
          <button
            onClick={handleDeleteClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
              bg-white/5 text-white/40 border border-white/10
              hover:bg-white/10 transition-all duration-200 active:scale-95 min-h-[36px]"
          >
            <HiTrash className="text-sm" />
            Delete
          </button>
        </div>
      </div>

      {/* PIN Modal for Delete */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="w-[90%] max-w-sm bg-surface-900 rounded-2xl border border-white/10 p-6 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <HiLockClosed className="text-xl text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {pinAction === 'delete' ? `Delete Order #${order.orderSequenceId}` : `Cancel Order #${order.orderSequenceId}`}
                </h3>
                <p className="text-xs text-white/40">Enter PIN to {pinAction}</p>
              </div>
            </div>

            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePinConfirm()}
                placeholder="Enter 5-digit PIN"
                className="input-field w-full py-3 px-4 text-center text-lg tracking-[0.5em] font-bold min-h-[48px]"
                autoFocus
              />
              {pinError && (
                <p className="text-red-400 text-xs text-center mt-2 animate-fade-in">{pinError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPinModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/60
                  bg-white/5 border border-white/10 hover:bg-white/10
                  transition-all duration-200 active:scale-95 min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handlePinConfirm}
                disabled={isProcessingAction || pin.length < 5}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400
                  transition-all duration-200 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              >
                {isProcessingAction ? 'Processing...' : (pinAction === 'delete' ? 'Delete Forever' : 'Cancel Order')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
