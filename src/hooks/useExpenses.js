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
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

function getStartOfPeriod(period) {
  const now = new Date();
  switch (period) {
    case 'day': return startOfDay(now);
    case 'week': return startOfWeek(now, { weekStartsOn: 0 });
    case 'month': return startOfMonth(now);
    default: return startOfDay(now);
  }
}

export function useExpenses(period = 'day') {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const periodStart = getStartOfPeriod(period);
    const periodTimestamp = Timestamp.fromDate(periodStart);

    const q = query(
      collection(db, 'expenses'),
      where('date', '>=', periodTimestamp)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })).sort((a, b) => {
          const timeA = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
          const timeB = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
          return timeB - timeA;
        });
        setExpenses(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useExpenses] snapshot error:', err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [period]);

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0,
    );

    const categoryMap = new Map();
    for (const e of expenses) {
      const cat = e.category || 'Other';
      const entry = categoryMap.get(cat) || { category: cat, count: 0, total: 0 };
      entry.count += 1;
      entry.total += Number(e.amount) || 0;
      categoryMap.set(cat, entry);
    }
    const categoryStats = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    return { totalExpenses, categoryStats, expenseCount: expenses.length };
  }, [expenses]);

  return { expenses, ...stats, loading };
}
