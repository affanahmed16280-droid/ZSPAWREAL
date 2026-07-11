import React, { useState, useMemo } from 'react';
import {
  HiClipboardList,
  HiClock,
  HiCheckCircle,
  HiShoppingCart,
} from 'react-icons/hi';
import { useOrders } from '../hooks/useOrders';
import { updateOrderStatus } from '../firebase/config';
import OrderCard from './OrderCard';
import toast from 'react-hot-toast';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Completed', label: 'Completed' },
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
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${newStatus}`);
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <HiClipboardList className="text-brand-400" />
          Order History
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {orders ? orders.length : 0} total orders
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '50ms' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`chip flex-1 text-center min-h-[44px] flex items-center justify-center gap-1.5 ${
              filter === f.key ? 'chip-active' : 'chip-inactive'
            }`}
          >
            {f.key === 'Pending' && <HiClock className="text-sm" />}
            {f.key === 'Completed' && <HiCheckCircle className="text-sm" />}
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
    </div>
  );
}
