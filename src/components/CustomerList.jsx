import React, { useState, useEffect, useCallback } from 'react';
import {
  HiSearch, HiUser, HiPhone, HiMail, HiLocationMarker,
  HiX, HiChevronRight, HiPencil, HiCheck, HiEye, HiShoppingCart, HiChat,
  HiUserGroup
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { getAllCustomers, getOrdersByCustomerPhone, updateCustomer } from '../firebase/config';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import OrderCard from './OrderCard';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCustomers();
      // Sort alphabetically by name
      const sorted = data.sort((a, b) => {
        const nameA = (a.displayName || a.name || '').toLowerCase();
        const nameB = (b.displayName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setCustomers(sorted);
      setFilteredCustomers(sorted);
    } catch (err) {
      toast.error('Failed to load customers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = customers.filter(c => 
      (c.displayName || c.name || '').toLowerCase().includes(lowerQuery) ||
      (c.phone || '').includes(lowerQuery)
    );
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  const openCustomerModal = async (customer) => {
    setSelectedCustomer(customer);
    setModalLoading(true);
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
    setEditing(false);
  };

  const startEdit = () => {
    setEditForm({
      name: selectedCustomer.displayName || selectedCustomer.name || '',
      email: selectedCustomer.email || '',
      address: selectedCustomer.address || '',
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateCustomer(selectedCustomer.phone, editForm);
      const updatedCustomer = {
        ...selectedCustomer,
        name: editForm.name,
        displayName: editForm.name,
        email: editForm.email,
        address: editForm.address,
      };
      setSelectedCustomer(updatedCustomer);
      
      // Update in main list
      setCustomers(prev => prev.map(c => c.phone === updatedCustomer.phone ? updatedCustomer : c));
      
      setEditing(false);
      toast.success('Customer details updated!');
    } catch (err) {
      toast.error('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-28 min-h-screen">
      {/* Header */}
      <div className="animate-fade-in flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <HiUserGroup className="text-2xl text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Directory</h1>
          <p className="text-sm text-white/50">{customers.length} total customers</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative animate-fade-in" style={{ animationDelay: '50ms' }}>
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or phone..."
          className="input-field w-full pl-11 pr-10 py-3.5 text-sm min-h-[48px]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 p-1 transition-colors duration-200"
          >
            <HiX className="text-lg" />
          </button>
        )}
      </div>

      {/* Customer List */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center">
            <HiUser className="text-5xl text-white/10 mb-3" />
            <p className="text-white/40 font-medium">No customers found</p>
            {searchQuery && <p className="text-xs text-white/30 mt-1">Try a different search term</p>}
          </div>
        ) : (
          filteredCustomers.map((customer, idx) => (
            <button
              key={customer.phone}
              onClick={() => openCustomerModal(customer)}
              className="w-full glass-card p-4 rounded-xl hover:bg-white/5 transition-all duration-200 active:scale-[0.98] text-left flex items-center gap-4"
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              <div className="w-12 h-12 rounded-full bg-accent-gold/15 flex items-center justify-center flex-shrink-0 border border-accent-gold/20">
                <span className="text-accent-gold font-bold text-lg">
                  {(customer.displayName || customer.name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white truncate">
                  {customer.displayName || customer.name || 'Unknown'}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-white/50 mt-0.5">
                  <HiPhone className="text-xs" />
                  <span>{customer.phone}</span>
                </div>
              </div>
              <HiChevronRight className="text-white/30 text-xl" />
            </button>
          ))
        )}
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
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-surface-950/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent-gold/15 flex items-center justify-center border border-accent-gold/20">
                  <span className="text-accent-gold font-bold text-xl">
                    {(selectedCustomer.displayName || selectedCustomer.name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedCustomer.displayName || selectedCustomer.name}</h3>
                  <p className="text-sm text-white/40 flex items-center gap-1">
                    <HiPhone className="text-xs" />
                    {selectedCustomer.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all duration-200 active:scale-90"
                >
                  <HiPhone className="text-xl" />
                </a>
                <a
                  href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-all duration-200 active:scale-90"
                >
                  <HiChat className="text-xl" />
                </a>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-90"
                >
                  <HiX className="text-xl" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Customer Edit Section */}
              {!editing ? (
                <div className="flex items-start justify-between bg-black/20 rounded-xl p-4 border border-white/5">
                  <div className="space-y-1.5 flex-1 pr-4 text-sm text-white/60">
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2">
                        <HiMail className="text-white/40 shrink-0" />
                        <span className="truncate">{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-center gap-2">
                        <HiLocationMarker className="text-white/40 shrink-0" />
                        <span className="truncate">{selectedCustomer.address}</span>
                      </div>
                    )}
                    {!selectedCustomer.email && !selectedCustomer.address && (
                      <p className="italic text-white/30 text-xs">No additional details</p>
                    )}
                  </div>
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-all active:scale-95 shrink-0"
                  >
                    <HiPencil className="text-sm" />
                    Edit
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-surface-800 rounded-xl border border-brand-500/30 space-y-3 animate-fade-in shadow-lg">
                  <h4 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Edit Customer Profile</h4>
                  
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Customer Name"
                      className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email Address"
                      className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Address"
                      className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-500 hover:to-brand-300 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Order History */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Order History</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-white/70">
                    {customerOrders.length} {customerOrders.length === 1 ? 'order' : 'orders'}
                  </span>
                </h4>

                {modalLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!modalLoading && customerOrders.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                    <HiShoppingCart className="text-2xl text-white/20 mx-auto mb-1" />
                    <p className="text-white/30 text-xs">No orders found</p>
                  </div>
                )}

                {!modalLoading && (
                  <div className="space-y-3">
                    {customerOrders.map((order, idx) => (
                      <div key={order.id || idx} className="animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                        <OrderCard order={order} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
