import React, { useState, useEffect, useRef } from 'react';
import {
  HiPhone,
  HiUser,
  HiCurrencyDollar,
  HiEye,
  HiCheckCircle,
  HiMail,
} from 'react-icons/hi';
import { createOrder, searchCustomers as fbSearchCustomers } from '../firebase/config';
import { validatePhone } from '../utils/helpers';
import toast from 'react-hot-toast';

const LENS_BRANDS = ['Varilux', 'Essilor', 'Zeiss', 'Hoya', 'Kodak', 'Other'];
const LENS_COATINGS = ['Blue Cut', 'Green Cut', 'Anti-Reflective', 'Photochromic', 'None'];

const initialForm = {
  orderType: 'prescription', // prescription, sunglasses, contact_lenses, servicing
  customerPhone: '',
  customerName: '',
  customerEmail: '',
  sphRight: '', cylRight: '', axisRight: '', addRight: '',
  sphLeft: '', cylLeft: '', axisLeft: '', addLeft: '',
  pd: '',
  lensBrand: '',
  lensCoating: '',
  frameDetails: '',
  sunglassBrand: '',
  sunglassModel: '',
  sunglassColor: '',
  contactBrand: '',
  quantity: '',
  serviceDescription: '',
  totalAmount: '',
};

const PrescriptionGrid = ({ eye, prefix, label, form, set }) => (
  <div className="glass-card p-4 space-y-3">
    <div className="flex items-center gap-2">
      <HiEye className="text-accent-gold" />
      <h3 className="text-sm font-semibold text-white">{label}</h3>
      <span className="text-xs text-white/30 ml-auto">{eye}</span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {['sph', 'cyl', 'axis', 'add'].map((field) => {
        const key = `${field}${prefix}`;
        const labels = { sph: 'SPH', cyl: 'CYL', axis: 'AXIS', add: 'ADD' };
        return (
          <div key={key}>
            <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-1 block">
              {labels[field]}
            </label>
            <input
              type="text"
              inputMode={field === 'axis' ? 'numeric' : 'text'}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={field === 'axis' ? '0-180' : '±0.00'}
              className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
            />
          </div>
        );
      })}
    </div>
  </div>
);

const ChipSelector = ({ label, options, field, form, set }) => (
  <div className="glass-card p-4 space-y-3">
    <h3 className="text-sm font-semibold text-white">{label}</h3>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => set(field, form[field] === opt ? '' : opt)}
          className={`chip min-h-[44px] px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
            form[field] === opt ? 'chip-active' : 'chip-inactive'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

export default function OrderForm() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState(false);
  const lookupTimer = useRef(null);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Auto-lookup customer by phone
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    const phone = form.customerPhone.replace(/\D/g, '');
    if (phone.length >= 7) {
      lookupTimer.current = setTimeout(async () => {
        try {
          const results = await fbSearchCustomers(phone);
          const normalizedPhone = phone.replace(/\D/g, '');
          const match = results.find((c) => {
            const cNorm = (c.phone || '').replace(/\D/g, '');
            return cNorm === normalizedPhone;
          });
          if (match) {
            set('customerName', match.name);
            setExistingCustomer(true);
          } else {
            setExistingCustomer(false);
          }
        } catch {
          setExistingCustomer(false);
        }
      }, 400);
    } else {
      setExistingCustomer(false);
    }
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [form.customerPhone]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.customerPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!validatePhone(form.customerPhone)) {
      toast.error('Enter a valid phone number');
      return;
    }
    if (!form.totalAmount || Number(form.totalAmount) <= 0) {
      toast.error('Total amount is required');
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        ...form,
        totalAmount: Number(form.totalAmount),
        status: 'Pending',
        orderDate: new Date().toISOString(),
      };
      const result = await createOrder(orderData);
      toast.success(`Order #${result.orderSequenceId || ''} created!`, {
        duration: 3000,
        icon: '🎉',
      });
      setForm(initialForm);
      setExistingCustomer(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-accent-gold/15 border border-accent-gold/20 flex items-center justify-center">
          <HiEye className="text-xl text-accent-gold" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">New Order</h1>
          <p className="text-xs text-white/40">Enter patient details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Type */}
        <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '25ms' }}>
          <h3 className="text-sm font-semibold text-white">Order Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['prescription', 'sunglasses', 'contact_lenses', 'servicing'].map((type) => {
              const labels = {
                prescription: 'Prescription Glasses',
                sunglasses: 'Sunglasses',
                contact_lenses: 'Contact Lenses',
                servicing: 'Servicing / Frame',
              };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('orderType', type)}
                  className={`chip min-h-[44px] px-3 py-2 text-[11px] font-medium transition-all duration-200 ${
                    form.orderType === type ? 'chip-active' : 'chip-inactive'
                  }`}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Customer Info */}
        <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HiUser className="text-accent-gold" />
            Customer Information
          </h3>
          <div className="relative">
            <HiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => set('customerPhone', e.target.value)}
              placeholder="Phone number"
              className="input-field w-full pl-10 pr-4 py-3 text-sm min-h-[48px]"
            />
            {existingCustomer && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <HiCheckCircle className="text-xs" />
                Existing
              </span>
            )}
          </div>
          <div className="relative">
            <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              placeholder="Customer name"
              className="input-field w-full pl-10 pr-4 py-3 text-sm min-h-[48px]"
            />
          </div>
          <div className="relative">
            <HiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="email"
              value={form.customerEmail}
              onChange={(e) => set('customerEmail', e.target.value)}
              placeholder="Email address (optional)"
              className="input-field w-full pl-10 pr-4 py-3 text-sm min-h-[48px]"
            />
          </div>
        </div>

        {/* === PRESCRIPTION GLASSES === */}
        {form.orderType === 'prescription' && (
          <>
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <PrescriptionGrid eye="OD" prefix="Right" label="Right Eye" form={form} set={set} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <PrescriptionGrid eye="OS" prefix="Left" label="Left Eye" form={form} set={set} />
            </div>
            <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <h3 className="text-sm font-semibold text-white">Pupillary Distance (PD)</h3>
              <input
                type="text"
                inputMode="decimal"
                value={form.pd}
                onChange={(e) => set('pd', e.target.value)}
                placeholder="e.g. 63"
                className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
              />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
              <ChipSelector label="Lens Brand" options={LENS_BRANDS} field="lensBrand" form={form} set={set} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <ChipSelector label="Lens Coating" options={LENS_COATINGS} field="lensCoating" form={form} set={set} />
            </div>
            <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '350ms' }}>
              <h3 className="text-sm font-semibold text-white">Frame Details</h3>
              <input
                type="text"
                value={form.frameDetails}
                onChange={(e) => set('frameDetails', e.target.value)}
                placeholder="Frame model / description"
                className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
              />
            </div>
          </>
        )}

        {/* === SUNGLASSES === */}
        {form.orderType === 'sunglasses' && (
          <>
            <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <h3 className="text-sm font-semibold text-white">Sunglasses Details</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.sunglassBrand}
                  onChange={(e) => set('sunglassBrand', e.target.value)}
                  placeholder="Brand (e.g. Ray-Ban)"
                  className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                />
                <input
                  type="text"
                  value={form.sunglassModel}
                  onChange={(e) => set('sunglassModel', e.target.value)}
                  placeholder="Model Name / Number"
                  className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                />
                <input
                  type="text"
                  value={form.sunglassColor}
                  onChange={(e) => set('sunglassColor', e.target.value)}
                  placeholder="Color (e.g. Matte Black)"
                  className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
                />
              </div>
            </div>
          </>
        )}

        {/* === CONTACT LENSES === */}
        {form.orderType === 'contact_lenses' && (
          <>
            <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <h3 className="text-sm font-semibold text-white">Contact Lens Brand</h3>
              <input
                type="text"
                value={form.contactBrand}
                onChange={(e) => set('contactBrand', e.target.value)}
                placeholder="Brand (e.g. Acuvue, Alcon)"
                className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
              />
            </div>
            
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <PrescriptionGrid eye="OD" prefix="Right" label="Right Eye Power" form={form} set={set} />
            </div>
            
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <PrescriptionGrid eye="OS" prefix="Left" label="Left Eye Power" form={form} set={set} />
            </div>
            
            <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '250ms' }}>
              <h3 className="text-sm font-semibold text-white">Box / Quantity</h3>
              <input
                type="text"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="e.g. 2 Boxes"
                className="input-field w-full py-2.5 px-3 text-sm min-h-[44px]"
              />
            </div>
          </>
        )}

        {/* === SERVICING / FRAME === */}
        {form.orderType === 'servicing' && (
          <>
            <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <h3 className="text-sm font-semibold text-white">Service Details</h3>
              <textarea
                value={form.serviceDescription}
                onChange={(e) => set('serviceDescription', e.target.value)}
                placeholder="Describe the repair or service needed (e.g. Frame alignment, nose pad replacement, screw loose)"
                className="input-field w-full py-2.5 px-3 text-sm min-h-[100px] resize-none"
              />
            </div>
          </>
        )}

        {/* Total Amount */}
        <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HiCurrencyDollar className="text-accent-gold" />
            Total Amount
          </h3>
          <div className="relative">
            <HiCurrencyDollar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg" />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.totalAmount}
              onChange={(e) => set('totalAmount', e.target.value)}
              placeholder="0.00"
              className="input-field w-full pl-10 pr-4 py-3.5 text-lg font-bold min-h-[52px]"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-4 rounded-xl text-base font-bold min-h-[52px] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <HiCheckCircle className="text-xl" />
                Create Order
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
