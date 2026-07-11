import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiSearch,
  HiPhone,
  HiUser,
  HiShoppingCart,
  HiCurrencyDollar,
  HiClock,
  HiX,
  HiChevronRight,
  HiCheckCircle,
} from 'react-icons/hi';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useStats } from '../hooks/useStats';
import { getOrdersByCustomerPhone } from '../firebase/config';
import { formatCurrency, formatDate, formatDateShort, getGreeting } from '../utils/helpers';
import MetricCard from './MetricCard';
import OrderCard from './OrderCard';

export default function Dashboard({ setActiveTab }) {
  const { orders, loading: ordersLoading } = useOrders();
  const { results, loading: searchLoading, error: searchError, searchCustomers } = useCustomers();
  const { totalOrders, totalRevenue, pendingOrders, loading: statsLoading } = useStats('day');

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  // Debounced search
  const handleSearch = useCallback(
    (value) => {
      setQuery(value);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (value.trim().length >= 2) {
        debounceTimer.current = setTimeout(() => {
          searchCustomers(value.trim());
          setShowResults(true);
        }, 300);
      } else {
        setShowResults(false);
      }
    },
    [searchCustomers]
  );

  // Close search results on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  const openCustomerModal = async (customer) => {
    setSelectedCustomer(customer);
    setModalLoading(true);
    setShowResults(false);
    try {
      const fetchedOrders = await getOrdersByCustomerPhone(customer.phone);
      setCustomerOrders(fetchedOrders || []);
    } catch {
      setCustomerOrders(customer.orders || []);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedCustomer(null);
    setCustomerOrders([]);
  };

  const recentOrders = (orders || []).slice(0, 5);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <p className="text-white/50 text-sm font-medium">{getGreeting()}</p>
        <h1 className="text-3xl font-extrabold mt-1 tracking-tight">
          <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-brand-500 bg-clip-text text-transparent">
            ZS Trading
          </span>
        </h1>
      </div>

      {/* Search */}
      <div ref={searchRef} className="relative animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="relative">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search customers by name or phone..."
            className="input-field w-full pl-11 pr-4 py-3.5 text-sm min-h-[48px]"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 p-1 transition-colors duration-200"
            >
              <HiX className="text-lg" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute left-0 right-0 mt-2 glass-card p-2 space-y-1 z-30 max-h-72 overflow-y-auto animate-slide-up">
            {searchLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!searchLoading && searchError && (
              <p className="text-center text-red-400 text-xs py-4 px-3">
                Search failed: {searchError.code || searchError.message || 'unknown error'}
              </p>
            )}
            {!searchLoading && !searchError && results.length === 0 && (
              <p className="text-center text-white/40 text-sm py-4">No customers found</p>
            )}
            {!searchLoading &&
              results.map((customer) => (
                <button
                  key={customer.phone}
                  onClick={() => openCustomerModal(customer)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 active:scale-[0.98] text-left min-h-[52px]"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                    <HiUser className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{customer.name}</p>
                    <p className="text-xs text-white/40">{customer.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 text-white/30">
                    <span className="text-xs">{(customer.orders || []).length} orders</span>
                    <HiChevronRight className="text-sm" />
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-3 flex-nowrap">
          <MetricCard
            icon={HiShoppingCart}
            label="Today's Orders"
            value={statsLoading ? '–' : totalOrders}
            gradient="bg-gradient-to-br from-blue-500 to-blue-700"
            delay="100ms"
          />
          <MetricCard
            icon={HiCurrencyDollar}
            label="Today's Revenue"
            value={statsLoading ? '–' : formatCurrency(totalRevenue)}
            gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
            delay="200ms"
          />
          <MetricCard
            icon={HiClock}
            label="Pending"
            value={statsLoading ? '–' : pendingOrders}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            delay="300ms"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '350ms' }}>
        <button
          onClick={() => setActiveTab('newOrder')}
          className="btn-primary flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold min-h-[48px] transition-all duration-200 active:scale-95"
        >
          <HiShoppingCart className="text-lg" />
          New Order
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className="glass-card flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white min-h-[48px] transition-all duration-200 active:scale-95 border border-white/10"
        >
          <HiChevronRight className="text-lg" />
          View Reports
        </button>
      </div>

      {/* Recent Orders */}
      <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Recent Orders</h2>
          {recentOrders.length > 0 && (
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs text-brand-400 font-semibold flex items-center gap-0.5 min-h-[44px] px-2 transition-colors duration-200 hover:text-brand-300"
            >
              View All <HiChevronRight />
            </button>
          )}
        </div>

        {ordersLoading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!ordersLoading && recentOrders.length === 0 && (
          <div className="glass-card p-8 text-center">
            <HiShoppingCart className="text-4xl text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No orders yet. Create your first!</p>
          </div>
        )}

        <div className="space-y-3">
          {recentOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] bg-surface-900 rounded-t-3xl sm:rounded-2xl border border-white/10 overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-500/15 flex items-center justify-center">
                  <HiUser className="text-xl text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedCustomer.name}</h3>
                  <p className="text-sm text-white/40 flex items-center gap-1">
                    <HiPhone className="text-xs" />
                    {selectedCustomer.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-90"
              >
                <HiX className="text-xl" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
                Order History
              </h4>

              {modalLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!modalLoading && customerOrders.length === 0 && (
                <p className="text-center text-white/30 text-sm py-8">No orders found</p>
              )}

              {!modalLoading &&
                customerOrders.map((order, idx) => {
                  const isPending = order.status === 'Pending';
                  return (
                    <div
                      key={order.id || idx}
                      className="glass-card-light p-4 space-y-2 animate-fade-in"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-brand-400">
                          Order #{order.orderSequenceId}
                        </span>
                        <span
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isPending ? (
                            <HiClock className="text-xs" />
                          ) : (
                            <HiCheckCircle className="text-xs" />
                          )}
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/40">{formatDate(order.orderDate)}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {order.lensBrand && (
                          <span className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded">
                            {order.lensBrand}
                          </span>
                        )}
                        {order.lensCoating && (
                          <span className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded">
                            {order.lensCoating}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold text-white">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
