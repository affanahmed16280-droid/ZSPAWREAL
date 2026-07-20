import React, { useState, useEffect, useCallback } from 'react';
import {
  HiSearch, HiUser, HiPhone, HiMail, HiLocationMarker,
  HiX, HiPencil, HiEye, HiShoppingCart, HiChat,
  HiUserGroup, HiTrash, HiLockClosed, HiSave, HiCheck,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import {
  getAllCustomers,
  getOrdersByCustomerPhone,
  updateCustomer,
  deleteCustomerAndOrders,
  getLatestOrderByPhone,
  updateOrderDetails,
} from '../firebase/config';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import OrderCard from './OrderCard';

// ─── WhatsApp URL helper ──────────────────────────────────────────────────────
// Converts any Bangladesh phone number to an international wa.me link.
// Handles: 01XXXXXXXXX → +8801XXXXXXXXX
//          8801XXXXXXXXX → +8801XXXXXXXXX
//          already +880... → +880...
function toWhatsAppUrl(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '#';

  let intl = digits;

  // If starts with 0 (local BD format), replace leading 0 with 880
  if (intl.startsWith('0')) {
    intl = '880' + intl.slice(1);
  }

  // If doesn't start with a country code at all (bare 9-digit local), add 880
  // Most BD numbers: 01XXXXXXXXX = 11 digits. If < 11 digits treat as local.
  // If already starts with 880 leave it.
  if (!intl.startsWith('880') && !intl.startsWith('1') && intl.length <= 10) {
    intl = '880' + intl;
  }

  return `https://wa.me/${intl}`;
}

// ─── Prescription field row ───────────────────────────────────────────────────
const PowerRow = ({ label, prefixKey, form, onChange }) => (
  <div>
    <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">{label}</label>
    <div className="grid grid-cols-4 gap-2">
      {['sph', 'cyl', 'axis', 'add'].map((f) => {
        const key = `${f}${prefixKey}`;
        const caps = { sph: 'SPH', cyl: 'CYL', axis: 'AXIS', add: 'ADD' };
        return (
          <div key={key}>
            <label className="text-[9px] text-white/30 uppercase font-semibold block mb-0.5 text-center">
              {caps[f]}
            </label>
            <input
              type="text"
              inputMode={f === 'axis' ? 'numeric' : 'decimal'}
              value={form[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={f === 'axis' ? '0' : '0.00'}
              className="input-field w-full py-2 px-2 text-xs text-center min-h-[40px]"
            />
          </div>
        );
      })}
    </div>
  </div>
);

// ─── PD Split Input ───────────────────────────────────────────────────────────
function PDInput({ pd, onChange }) {
  const parts = (pd || '').split('/');
  const right = parts[0] ?? '';
  const left  = parts[1] ?? '';

  const update = (side, val) => {
    const r = side === 'r' ? val : right;
    const l = side === 'l' ? val : left;
    onChange(l !== '' ? `${r}/${l}` : r);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label className="text-[9px] text-white/30 uppercase font-semibold block mb-0.5 text-center">Right (OD)</label>
        <input
          type="text"
          inputMode="decimal"
          value={right}
          onChange={(e) => update('r', e.target.value)}
          placeholder="e.g. 32"
          className="input-field w-full py-2 px-2 text-xs text-center min-h-[40px]"
        />
      </div>
      <div className="flex flex-col items-center pt-4">
        <span className="text-xl font-bold text-white/30 select-none">/</span>
      </div>
      <div className="flex-1">
        <label className="text-[9px] text-white/30 uppercase font-semibold block mb-0.5 text-center">Left (OS)</label>
        <input
          type="text"
          inputMode="decimal"
          value={left}
          onChange={(e) => update('l', e.target.value)}
          placeholder="e.g. 31"
          className="input-field w-full py-2 px-2 text-xs text-center min-h-[40px]"
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', phone: '', email: '', address: '', pd: '',
    sphRight: '', cylRight: '', axisRight: '', addRight: '',
    sphLeft: '', cylLeft: '', axisLeft: '', addLeft: '',
  });
  const [latestOrderId, setLatestOrderId] = useState(null);
  const [hasPrescription, setHasPrescription] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete / PIN state
  const [showPinModal, setShowPinModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCustomers();
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

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredCustomers(customers); return; }
    const lq = searchQuery.toLowerCase();
    setFilteredCustomers(
      customers.filter(c =>
        (c.displayName || c.name || '').toLowerCase().includes(lq) ||
        (c.phone || '').includes(lq)
      )
    );
  }, [searchQuery, customers]);

  // ─── Open modal ─────────────────────────────────────────────────────────────
  const openCustomerModal = async (customer) => {
    setSelectedCustomer(customer);
    setEditing(false);
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
    setLatestOrderId(null);
    setHasPrescription(false);
  };

  // ─── Start editing ──────────────────────────────────────────────────────────
  const startEdit = async () => {
    const base = {
      name: selectedCustomer.displayName || selectedCustomer.name || '',
      phone: selectedCustomer.phone || '',
      email: selectedCustomer.email || '',
      address: selectedCustomer.address || '',
      pd: '',
      sphRight: '', cylRight: '', axisRight: '', addRight: '',
      sphLeft: '', cylLeft: '', axisLeft: '', addLeft: '',
    };

    // Try to load latest order for prescription fields
    try {
      const latest = await getLatestOrderByPhone(selectedCustomer.phone);
      if (latest && latest.orderType === 'prescription') {
        base.sphRight  = latest.sphRight  ?? '';
        base.cylRight  = latest.cylRight  ?? '';
        base.axisRight = latest.axisRight ?? '';
        base.addRight  = latest.addRight  ?? '';
        base.sphLeft   = latest.sphLeft   ?? '';
        base.cylLeft   = latest.cylLeft   ?? '';
        base.axisLeft  = latest.axisLeft  ?? '';
        base.addLeft   = latest.addLeft   ?? '';
        base.pd        = latest.pd        ?? '';
        setLatestOrderId(latest.id);
        setHasPrescription(true);
      } else {
        setLatestOrderId(null);
        setHasPrescription(false);
      }
    } catch {
      setLatestOrderId(null);
      setHasPrescription(false);
    }

    setEditForm(base);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const setField = (key, val) => setEditForm(prev => ({ ...prev, [key]: val }));

  // ─── Save edit ──────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editForm.phone.trim()) {
      toast.error('Phone number cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const oldPhone = selectedCustomer.phone;

      // Update customer profile (handles phone migration internally)
      await updateCustomer(oldPhone, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
      });

      // If there's a latest prescription order, update its power fields
      if (latestOrderId && hasPrescription) {
        await updateOrderDetails(latestOrderId, {
          sphRight:  editForm.sphRight  || null,
          cylRight:  editForm.cylRight  || null,
          axisRight: editForm.axisRight || null,
          addRight:  editForm.addRight  || null,
          sphLeft:   editForm.sphLeft   || null,
          cylLeft:   editForm.cylLeft   || null,
          axisLeft:  editForm.axisLeft  || null,
          addLeft:   editForm.addLeft   || null,
          pd:        editForm.pd        || null,
        });
      }

      const newPhone = editForm.phone.replace(/\D/g, '') || oldPhone;
      const updatedCustomer = {
        ...selectedCustomer,
        phone: newPhone,
        name: editForm.name.toLowerCase(),
        displayName: editForm.name,
        email: editForm.email,
        address: editForm.address,
      };

      setSelectedCustomer(updatedCustomer);
      setCustomers(prev =>
        prev.map(c => c.phone === oldPhone ? updatedCustomer : c)
      );

      setEditing(false);
      toast.success('Customer updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete flow ─────────────────────────────────────────────────────────────
  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer || selectedCustomer);
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const confirmDeleteCustomer = async () => {
    if (pin !== '62376') { setPinError('Incorrect PIN'); return; }
    if (!customerToDelete) return;

    setDeleting(true);
    try {
      await deleteCustomerAndOrders(customerToDelete.phone);
      setCustomers(prev => prev.filter(c => c.phone !== customerToDelete.phone));
      toast.success('Customer & all orders deleted permanently');
      setShowPinModal(false);
      setCustomerToDelete(null);
      closeModal();
    } catch (err) {
      toast.error('Failed to delete customer');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
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
            <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center">
            <HiUser className="text-5xl text-white/10 mb-3" />
            <p className="text-white/40 font-medium">No customers found</p>
            {searchQuery && <p className="text-xs text-white/30 mt-1">Try a different search term</p>}
          </div>
        ) : (
          filteredCustomers.map((customer, idx) => (
            <div
              key={customer.phone}
              className="w-full glass-card p-4 rounded-xl hover:bg-white/5 transition-all duration-200 text-left flex items-center gap-4 cursor-pointer"
              style={{ animationDelay: `${idx * 20}ms` }}
              onClick={() => openCustomerModal(customer)}
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
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(customer); }}
                className="p-2 text-white/30 hover:text-red-400 bg-white/5 hover:bg-red-500/20 rounded-lg transition-all"
                title="Delete Customer"
              >
                <HiTrash className="text-xl" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Customer Detail Modal ─────────────────────────────────────────────── */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] bg-surface-900 rounded-t-3xl sm:rounded-2xl border border-white/10 overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-surface-950/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent-gold/15 flex items-center justify-center border border-accent-gold/20">
                  <span className="text-accent-gold font-bold text-xl">
                    {(selectedCustomer.displayName || selectedCustomer.name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedCustomer.displayName || selectedCustomer.name}
                  </h3>
                  <p className="text-sm text-white/40 flex items-center gap-1">
                    <HiPhone className="text-xs" />
                    {selectedCustomer.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Phone call */}
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all duration-200 active:scale-90"
                  title="Call customer"
                >
                  <HiPhone className="text-xl" />
                </a>

                {/* WhatsApp — with BD country code fix */}
                <a
                  href={toWhatsAppUrl(selectedCustomer.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-all duration-200 active:scale-90"
                  title="Open WhatsApp"
                >
                  <HiChat className="text-xl" />
                </a>

                {/* Close */}
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

              {/* ── View / Edit section ────────────────────────────────────── */}
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
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-all active:scale-95 w-full justify-center"
                    >
                      <HiPencil className="text-sm" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(selectedCustomer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95 w-full justify-center"
                    >
                      <HiTrash className="text-sm" /> Delete
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Edit Form ──────────────────────────────────────────────── */
                <div className="p-4 bg-surface-800 rounded-xl border border-brand-500/30 space-y-4 animate-fade-in shadow-lg">
                  <h4 className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                    Edit Customer Profile
                  </h4>

                  {/* Name */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="Customer Name"
                      className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">
                      Phone Number
                      <span className="text-yellow-400/70 ml-1.5 normal-case font-normal">
                        (changing this migrates all orders)
                      </span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={editForm.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="e.g. 01712345678"
                      className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setField('email', e.target.value)}
                      placeholder="Email Address"
                      className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setField('address', e.target.value)}
                      placeholder="Address"
                      className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                    />
                  </div>

                  {/* Prescription Power (only if latest order is prescription) */}
                  {hasPrescription && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2">
                        <HiEye className="text-accent-gold text-sm" />
                        <h5 className="text-[10px] font-semibold text-accent-gold uppercase tracking-wider">
                          Latest Prescription Power
                        </h5>
                      </div>
                      <PowerRow label="Right Eye (OD)" prefixKey="Right" form={editForm} onChange={setField} />
                      <PowerRow label="Left Eye (OS)" prefixKey="Left" form={editForm} onChange={setField} />
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold ml-1 mb-1 block">Pupillary Distance (PD)</label>
                        <PDInput pd={editForm.pd} onChange={(val) => setField('pd', val)} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-500 hover:to-brand-300 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {saving ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                      ) : (
                        <><HiSave className="text-sm" /> Save Changes</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Order History ────────────────────────────────────────────── */}
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

      {/* ── PIN Modal for Delete ──────────────────────────────────────────────── */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="w-[90%] max-w-sm bg-surface-900 rounded-2xl border border-white/10 p-6 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                <HiLockClosed className="text-xl text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Customer</h3>
                <p className="text-xs text-white/40">
                  This will delete <span className="text-red-300 font-semibold">
                    {customerToDelete?.displayName || customerToDelete?.name || 'this customer'}
                  </span> &amp; all their orders permanently.
                </p>
              </div>
            </div>

            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setPinError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && confirmDeleteCustomer()}
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
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 active:scale-95 min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                disabled={deleting || pin.length < 5}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400"
              >
                {deleting ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
