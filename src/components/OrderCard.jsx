import React from 'react';
import { HiCurrencyDollar, HiPhone, HiCheckCircle, HiClock } from 'react-icons/hi';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import { updateOrderStatus } from '../firebase/config';
import toast from 'react-hot-toast';

const statusConfig = {
  Pending: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: HiClock,
  },
  Completed: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: HiCheckCircle,
  },
};

export default function OrderCard({ order, onStatusToggle }) {
  const config = statusConfig[order.status] || statusConfig.Pending;
  const StatusIcon = config.icon;

  const handleToggle = async () => {
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

  return (
    <div className="glass-card-light p-4 animate-fade-in">
      {/* Top Row: Order ID + Status */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-brand-400 tracking-wide">
          Order #{order.orderSequenceId}
        </h3>
        <button
          onClick={handleToggle}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
            border transition-all duration-200 active:scale-95 min-h-[32px]
            ${config.bg} ${config.text} ${config.border}
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

      {/* Lens & Coating Details */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {order.lensBrand && (
          <span className="text-xs bg-white/5 text-white/50 px-2.5 py-1 rounded-md border border-white/5">
            {order.lensBrand}
          </span>
        )}
        {order.lensCoating && (
          <span className="text-xs bg-white/5 text-white/50 px-2.5 py-1 rounded-md border border-white/5">
            {order.lensCoating}
          </span>
        )}
      </div>

      {/* Bottom Row: Amount + Date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white">
          <HiCurrencyDollar className="text-brand-400" />
          <span className="text-lg font-bold">{formatCurrency(order.totalAmount)}</span>
        </div>
        <span className="text-xs text-white/30 font-medium">
          {formatDateShort(order.orderDate)}
        </span>
      </div>
    </div>
  );
}
