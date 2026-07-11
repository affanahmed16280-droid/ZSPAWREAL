import React, { useState } from 'react';
import {
  HiCurrencyDollar,
  HiTrash,
  HiPlus,
  HiX,
  HiLockClosed,
} from 'react-icons/hi';
import { formatCurrency } from '../utils/helpers';
import { addExpense, deleteExpense } from '../firebase/config';
import { useExpenses } from '../hooks/useExpenses';
import toast from 'react-hot-toast';

const DELETE_PIN = '62376';

const CATEGORIES = [
  'Lens Bill',
  'Frame/Sunglass Bill',
  'Food',
  'Staff Salary',
  'Utilities',
  'Transport',
  'Other',
];

const CATEGORY_COLORS = {
  'Lens Bill': 'from-zinc-600 to-zinc-800',
  'Frame/Sunglass Bill': 'from-zinc-600 to-zinc-800',
  'Food': 'from-zinc-600 to-zinc-800',
  'Staff Salary': 'from-zinc-600 to-zinc-800',
  'Utilities': 'from-zinc-600 to-zinc-800',
  'Transport': 'from-zinc-600 to-zinc-800',
  'Other': 'from-zinc-600 to-zinc-800',
};

const PERIODS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export default function Expenses() {
  const [period, setPeriod] = useState('day');
  const { expenses, totalExpenses, expenseCount, categoryStats, loading } = useExpenses(period);

  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState('Lens Bill');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const maxCatTotal = categoryStats.length > 0
    ? Math.max(...categoryStats.map((c) => c.total), 1)
    : 1;

  const handleSave = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await addExpense({ category, description, amount: Number(amount) });
      toast.success('Expense added');
      setShowAddModal(false);
      setCategory('Lens Bill');
      setDescription('');
      setAmount('');
    } catch (err) {
      toast.error('Failed to add expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (expense) => {
    setDeleteTarget(expense);
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
      await deleteExpense(deleteTarget.id);
      toast.success('Expense deleted');
      setShowPinModal(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-28">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <HiCurrencyDollar className="text-white" />
          Expenses
        </h1>
        <p className="text-sm text-white/40 mt-1">Track your shop expenses</p>
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

      {/* Add Expense Button */}
      <div className="animate-fade-in" style={{ animationDelay: '75ms' }}>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold
            bg-gradient-to-b from-brand-700 to-brand-900 border border-brand-600 text-white
            hover:from-brand-600 hover:to-brand-800
            transition-all duration-200 active:scale-[0.97]
            min-h-[48px] shadow-lg shadow-black/50"
        >
          <HiPlus className="text-lg" />
          Add Expense
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                <HiCurrencyDollar className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-white/40 mt-0.5">Total Expenses</p>
            </div>
            <div className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                <HiCurrencyDollar className="text-white text-base" />
              </div>
              <p className="text-2xl font-bold text-white">{expenseCount}</p>
              <p className="text-xs text-white/40 mt-0.5">Entries</p>
            </div>
          </div>

          {/* Category Breakdown */}
          {categoryStats.length > 0 && (
            <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white" />
                By Category
              </h3>
              <div className="space-y-4">
                {categoryStats.map((item, idx) => (
                  <div key={item.category} className="animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white">{item.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">{item.count} entries</span>
                        <span className="text-xs font-semibold text-white">{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.round((item.total / maxCatTotal) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Expenses List */}
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              Recent Expenses
            </h3>
            {expenses.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <HiCurrencyDollar className="text-3xl text-white/15 mx-auto mb-2" />
                <p className="text-sm text-white/30">No expenses in this period</p>
              </div>
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="glass-card-light p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-gradient-to-r ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS['Other']} text-white`}>
                      {e.category}
                    </span>
                    <button
                      onClick={() => handleDeleteClick(e)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                        bg-red-500/10 text-red-400 border border-red-500/20
                        hover:bg-red-500/20 transition-all duration-200 active:scale-95 min-h-[32px]"
                    >
                      <HiTrash className="text-sm" />
                    </button>
                  </div>
                  {e.description && (
                    <p className="text-sm text-white/60 mb-2">{e.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-white">{formatCurrency(e.amount)}</span>
                    <span className="text-xs text-white/30">
                      {new Date(e.date?.toDate ? e.date.toDate() : e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-[90%] max-w-sm bg-surface-900 rounded-2xl border border-white/10 p-6 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add Expense</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <HiX />
              </button>
            </div>

            <div>
              <label className="text-xs text-white/50 font-medium block mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field w-full py-3 px-4 min-h-[48px] appearance-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-white/50 font-medium block mb-1.5">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly rent, lunch"
                className="input-field w-full py-3 px-4 min-h-[48px]"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 font-medium block mb-1.5">Amount (৳)</label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="input-field w-full py-3 px-4 text-lg font-bold min-h-[48px]"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !amount}
              className="btn-primary w-full py-3.5 rounded-xl text-sm font-bold text-white min-h-[48px]"
            >
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </div>
      )}

      {/* Delete PIN Modal */}
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
                <h3 className="text-base font-bold text-white">Delete Expense</h3>
                <p className="text-xs text-white/40">Enter PIN to permanently delete</p>
              </div>
            </div>

            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setPinError(''); }}
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
    </div>
  );
}
