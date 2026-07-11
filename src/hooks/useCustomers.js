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
  documentId
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

      const normalized = normalizePhone(trimmed);
      const lowerQuery = trimmed.toLowerCase();
      
      const queries = [];
      
      // Phone query
      if (normalized.length > 0) {
        queries.push(
          getDocs(
            query(
              customersCol,
              where(documentId(), '>=', normalized),
              where(documentId(), '<=', normalized + '\uf8ff'),
              limit(20)
            )
          )
        );
      }
      
      // Name query
      queries.push(
        getDocs(
          query(
            customersCol,
            where('name', '>=', lowerQuery),
            where('name', '<=', lowerQuery + '\uf8ff'),
            limit(20)
          )
        )
      );
      
      const snaps = await Promise.all(queries);
      let customerDocs = snaps.flatMap(snap => snap.docs);
      
      // Deduplicate
      const uniqueDocs = [];
      const seen = new Set();
      for (const doc of customerDocs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          uniqueDocs.push(doc);
        }
      }
      
      // Fallback
      if (uniqueDocs.length === 0 && normalized.length >= 7) {
        const exactRef = doc(customersCol, normalized);
        const exactSnap = await getDoc(exactRef);
        if (exactSnap.exists()) {
          uniqueDocs.push(exactSnap);
        }
      }
      
      customerDocs = uniqueDocs;

      // For every matching customer, fetch their orders in parallel
      const customers = await Promise.all(
        customerDocs.map(async (customerDoc) => {
          const phone = customerDoc.id;
          const customerData = customerDoc.data();

          const ordersQuery = query(
            ordersCol,
            where('customerPhone', '==', phone)
          );

          const ordersSnap = await getDocs(ordersQuery);
          const orders = ordersSnap.docs.map((od) => ({
            id: od.id,
            ...od.data(),
          })).sort((a, b) => {
            const timeA = a.orderDate?.toMillis ? a.orderDate.toMillis() : new Date(a.orderDate).getTime();
            const timeB = b.orderDate?.toMillis ? b.orderDate.toMillis() : new Date(b.orderDate).getTime();
            return timeB - timeA;
          });

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
