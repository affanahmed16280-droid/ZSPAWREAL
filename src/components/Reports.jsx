import React, { useState, useMemo } from 'react';
import {
  HiChartBar,
  HiCurrencyDollar,
  HiShoppingCart,
  HiCheckCircle,
  HiClock,
  HiTrendingUp,
  HiRefresh,
} from 'react-icons/hi';
import { useStats } from '../hooks/useStats';
import { formatCurrency } from '../utils/helpers';
import { backfillMissingCustomers } from '../firebase/config';
import toast from 'react-hot-toast';

const PERIODS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export default function Reports() {
  const [period, setPeriod] = useState('day');
  const [repairing, setRepairing] = useState(false);
  const { totalOrders, totalRevenue, pendingOrders, completedOrders, brandStats, coatingStats, loading } = useStats(period);

  const handleRepairCustomers = async () => {
    setRepairing(true);
    try {
      const { scanned, created } = await backfillMissingCustomers();
      if (created > 0) {
        toast.success(`Fixed ${created} customer${created === 1 ? '' : 's'} that weren't showing up in search.`, { duration: 4000 });
      } else {
        toast.success(`Checked ${scanned} customer${scanned === 1 ? '' : 's'} — everything already matched up.`, { duration: 4000 });
      }
    } catch (err) {
      toast.error(err.message || 'Repair failed');
    } finally {
      setRepairing(false);
    }
  };

  const avgOrderValue = useMemo(() => {
    if (!totalOrders || totalOrders === 0) return 0;
    return Math.round(totalRevenue / totalOrders);
  }, [totalRevenue, totalOrders]);

  const maxBrandCount = useMemo(() => {
    if (!brandStats || brandStats.length === 0) return 1;
    return Math.max(...brandStats.map((b) => b.count), 1);
  }, [brandStats]);

  const maxCoatingCount = useMemo(() => {
    if (!coatingStats || coatingStats.length === 0) return 1;
    return Math.max(...coatingStats.map((c) => c.count), 1);
  }, [coatingStats]);

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

          {/* Lens Brand Breakdown */}
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              Popular Lens Brands
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

          {/* Repair Customer Search */}
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '350ms' }}>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <HiRefresh className="text-brand-400" />
              Fix Customer Search
            </h3>
            <p className="text-xs text-white/40 mb-3">
              If a customer's name shows on an order but doesn't turn up in search, tap this to rebuild any missing customer records from your orders.
            </p>
            <button
              onClick={handleRepairCustomers}
              disabled={repairing}
              className="glass-card-light w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white/80 hover:text-white min-h-[44px] transition-all duration-200 active:scale-95 border border-white/10 disabled:opacity-50"
            >
              {repairing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Checking orders...
                </>
              ) : (
                <>
                  <HiRefresh className="text-base" />
                  Repair Customer Records
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
