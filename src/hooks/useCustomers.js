import { useState, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Normalize a phone string by stripping all non-digit characters.
 */
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

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

      let customerDocs = [];
      const isPhone = /^\d/.test(trimmed) && trimmed.length >= 3;

      if (isPhone) {
        const normalized = normalizePhone(trimmed);

        // Phone-prefix search using document-ID range query
        const customerQuery = query(
          customersCol,
          where('__name__', '>=', normalized),
          where('__name__', '<=', normalized + '\uf8ff'),
          limit(20),
        );

        const customerSnap = await getDocs(customerQuery);
        customerDocs = customerSnap.docs;

        // Fallback: try exact document lookup if prefix search returned nothing
        if (customerDocs.length === 0 && normalized.length >= 7) {
          const exactRef = doc(customersCol, normalized);
          const exactSnap = await getDoc(exactRef);
          if (exactSnap.exists()) {
            customerDocs = [exactSnap];
          }
        }
      } else {
        // Name-prefix search (lowercase stored in `name` field)
        const lowerQuery = trimmed.toLowerCase();
        const customerQuery = query(
          customersCol,
          where('name', '>=', lowerQuery),
          where('name', '<=', lowerQuery + '\uf8ff'),
          limit(20),
        );

        const customerSnap = await getDocs(customerQuery);
        customerDocs = customerSnap.docs;
      }

      // For every matching customer, fetch their orders in parallel
      const customers = await Promise.all(
        customerDocs.map(async (customerDoc) => {
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
