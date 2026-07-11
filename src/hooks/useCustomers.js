import { useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * useCustomers — search customers by phone prefix or name prefix.
 *
 * Usage:
 *   const { results, loading, searchCustomers } = useCustomers();
 *   searchCustomers('John');   // name prefix search
 *   searchCustomers('555');    // phone prefix search
 *
 * Each result includes the customer's orders array.
 *
 * @returns {{
 *   results: Array<{ phone: string, name: string, createdAt: any, orders: Array }>,
 *   loading: boolean,
 *   searchCustomers: (queryStr: string) => Promise<void>,
 * }}
 */
export function useCustomers() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchCustomers = useCallback(async (queryStr) => {
    // Empty query → clear results immediately
    if (!queryStr || queryStr.trim().length === 0) {
      setResults([]);
      return;
    }

    const trimmed = queryStr.trim();
    setLoading(true);

    try {
      const customersCol = collection(db, 'customers');
      const ordersCol = collection(db, 'orders');

      let customerQuery;
      const isPhone = /^\d/.test(trimmed) && trimmed.length >= 3;

      if (isPhone) {
        // Phone-prefix search using document-ID range query
        customerQuery = query(
          customersCol,
          where('__name__', '>=', trimmed),
          where('__name__', '<=', trimmed + '\uf8ff'),
          limit(20),
        );
      } else {
        // Name-prefix search (lowercase stored in `name` field)
        const lowerQuery = trimmed.toLowerCase();
        customerQuery = query(
          customersCol,
          where('name', '>=', lowerQuery),
          where('name', '<=', lowerQuery + '\uf8ff'),
          limit(20),
        );
      }

      const customerSnap = await getDocs(customerQuery);

      // For every matching customer, fetch their orders in parallel
      const customers = await Promise.all(
        customerSnap.docs.map(async (customerDoc) => {
          const phone = customerDoc.id;
          const customerData = customerDoc.data();

          const ordersQuery = query(
            ordersCol,
            where('customerPhone', '==', phone),
            orderBy('orderDate', 'desc'),
          );

          const ordersSnap = await getDocs(ordersQuery);
          const orders = ordersSnap.docs.map((od) => ({
            id: od.id,
            ...od.data(),
          }));

          return {
            phone,
            name: customerData.displayName ?? customerData.name,
            createdAt: customerData.createdAt ?? null,
            orders,
          };
        }),
      );

      setResults(customers);
    } catch (err) {
      console.error('[useCustomers] search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, searchCustomers };
}
