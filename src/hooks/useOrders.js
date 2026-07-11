import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * useOrders — real-time listener on the `orders` collection.
 *
 * Returns the latest 100 orders sorted newest-first, plus loading / error
 * states.  The listener is automatically torn down when the consuming
 * component unmounts.
 *
 * @returns {{ orders: Array, loading: boolean, error: Error | null }}
 */
export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      orderBy('orderDate', 'desc'),
      limit(100),
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
        setError(null);
      },
      (err) => {
        console.error('[useOrders] snapshot error:', err);
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { orders, loading, error };
}
