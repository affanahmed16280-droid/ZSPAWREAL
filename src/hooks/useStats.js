import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';

/**
 * Resolve the start-of-period Date for a given period label.
 * @param {'day' | 'week' | 'month'} period
 * @returns {Date}
 */
function getStartOfPeriod(period) {
  const now = new Date();
  switch (period) {
    case 'day':
      return startOfDay(now);
    case 'week':
      return startOfWeek(now, { weekStartsOn: 0 }); // Sunday
    case 'month':
      return startOfMonth(now);
    default:
      return startOfDay(now);
  }
}

/**
 * useStats — real-time sales analytics for a given period.
 *
 * @param {'day' | 'week' | 'month'} period
 * @returns {{
 *   totalOrders: number,
 *   totalRevenue: number,
 *   pendingOrders: number,
 *   completedOrders: number,
 *   brandStats: Array<{ brand: string, count: number, revenue: number }>,
 *   coatingStats: Array<{ coating: string, count: number, revenue: number }>,
 *   dailyRevenue: Array<{ date: string, revenue: number }>,
 *   loading: boolean,
 * }}
 */
export function useStats(period = 'day') {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Real-time listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const periodStart = getStartOfPeriod(period);
    const periodTimestamp = Timestamp.fromDate(periodStart);

    const q = query(
      collection(db, 'orders'),
      where('orderDate', '>=', periodTimestamp),
      orderBy('orderDate', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useStats] snapshot error:', err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [period]);

  // ── Derived statistics (recomputed only when orders change) ────────────────
  const stats = useMemo(() => {
    const totalOrders = orders.length;

    const totalRevenue = orders.reduce(
      (sum, o) => sum + (Number(o.totalAmount) || 0),
      0,
    );

    const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
    const completedOrders = orders.filter(
      (o) => o.status === 'Completed',
    ).length;

    // ── Brand stats ──────────────────────────────────────────────────────────
    const brandMap = new Map();
    for (const o of orders) {
      if (o.orderType && o.orderType !== 'prescription') continue;
      
      const brand = o.lensBrand || 'Unknown';
      const entry = brandMap.get(brand) || { brand, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(o.totalAmount) || 0;
      brandMap.set(brand, entry);
    }
    const brandStats = Array.from(brandMap.values()).sort(
      (a, b) => b.count - a.count,
    );

    // ── Coating stats ────────────────────────────────────────────────────────
    const coatingMap = new Map();
    for (const o of orders) {
      if (o.orderType && o.orderType !== 'prescription') continue;
      
      const coating = o.lensCoating || 'None';
      const entry = coatingMap.get(coating) || {
        coating,
        count: 0,
        revenue: 0,
      };
      entry.count += 1;
      entry.revenue += Number(o.totalAmount) || 0;
      coatingMap.set(coating, entry);
    }
    const coatingStats = Array.from(coatingMap.values()).sort(
      (a, b) => b.count - a.count,
    );

    // ── Type stats ───────────────────────────────────────────────────────────
    const typeMap = new Map();
    for (const o of orders) {
      const type = o.orderType || 'prescription';
      const entry = typeMap.get(type) || { type, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(o.totalAmount) || 0;
      typeMap.set(type, entry);
    }
    const typeStats = Array.from(typeMap.values()).sort(
      (a, b) => b.count - a.count,
    );

    // ── Daily revenue ────────────────────────────────────────────────────────
    const dailyMap = new Map();
    for (const o of orders) {
      const date = o.orderDate?.toDate
        ? o.orderDate.toDate()
        : new Date(o.orderDate);
      const key = format(date, 'yyyy-MM-dd');
      const current = dailyMap.get(key) || 0;
      dailyMap.set(key, current + (Number(o.totalAmount) || 0));
    }

    // Sort chronologically
    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      brandStats,
      coatingStats,
      typeStats,
      dailyRevenue,
    };
  }, [orders]);

  return { ...stats, loading };
}
