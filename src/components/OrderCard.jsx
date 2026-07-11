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

const DELETE_PIN = '62376';

const statusConfig = {
  Pending: {
    bg: 'bg-accent-gold/15',
    text: 'text-accent-gold',
    border: 'border-accent-gold/30',
    icon: HiClock,
  },
  Completed: {
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
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleToggle = async () => {
    if (order.status === 'Cancelled') return;
    const newStatus = order.status === 'Pending' ? 'Completed' : 'Pending';
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

  const handleCancel = async () => {
    if (order.status === 'Cancelled') return;
    setCancelling(true);
    try {
      await updateOrderStatus(order.id, 'Cancelled');
      if (onStatusToggle) {
        onStatusToggle(order.id, 'Cancelled');
      }
      toast.success(`Order #${order.orderSequenceId} cancelled`);
    } catch (err) {
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteClick = () => {
    setShowPinModal(true);
    setPin('');
    setPinError('');
  };

  const handleDeleteConfirm = async () => {
    if (pin !== DELETE_PIN) {
      setPinError('Incorrect PIN');
      return;
    }
    setDeleting(true);
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
      setDeleting(false);
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          {order.status !== 'Cancelled' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                bg-white/5 text-white/50 border border-white/10
                hover:bg-white/10 transition-all duration-200 active:scale-95
                disabled:opacity-50 min-h-[36px]"
            >
              <HiBan className="text-sm" />
              {cancelling ? 'Cancelling...' : 'Cancel'}
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
                <h3 className="text-base font-bold text-white">Delete Order #{order.orderSequenceId}</h3>
                <p className="text-xs text-white/40">Enter PIN to permanently delete</p>
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
                onKeyDown={(e) => e.key === 'Enter' && handleDeleteConfirm()}
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
                onClick={handleDeleteConfirm}
                disabled={deleting || pin.length < 5}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400
                  transition-all duration-200 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
