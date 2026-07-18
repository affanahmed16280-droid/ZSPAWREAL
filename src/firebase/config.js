import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  Timestamp,
  startAt,
  endAt,
  documentId,
} from 'firebase/firestore';

// ─── Firebase Configuration ──────────────────────────────────────────────────
// Replace every value below with your own Firebase project credentials.
// You can find these in the Firebase Console → Project Settings → General.
const firebaseConfig = {
  apiKey: "AIzaSyA_vT9v4D9p1JdXANCaSBH47SsbtjzqeV4",
  authDomain: "zstradingcus.firebaseapp.com",
  projectId: "zstradingcus",
  storageBucket: "zstradingcus.firebasestorage.app",
  messagingSenderId: "1094036248886",
  appId: "1:1094036248886:web:805821ffb40b778212fb97"
};

// ─── Initialize Firebase & Firestore ─────────────────────────────────────────
const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

const auth = getAuth(app);

export { db, auth };

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Normalize a phone string by stripping all non-digit characters.
 * This ensures consistent storage and lookup.
 */
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

// ─── Collection References ───────────────────────────────────────────────────
const ordersCol = collection(db, 'orders');
const customersCol = collection(db, 'customers');
const countersDoc = doc(db, 'metadata', 'counters');

// ─── createOrder ─────────────────────────────────────────────────────────────
// Atomically creates an order with a sequential ID.
//
// Steps:
//   1. Ensure the customer document exists at customers/{phone}.
//   2. Run a transaction to increment metadata/counters.totalOrders.
//   3. Create the order document with the new sequential ID.
//   4. Return an object with the sequential ID.
export async function createOrder({
  orderType,
  customerPhone,
  customerName,
  customerEmail,
  customerAddress,
  sphRight,
  cylRight,
  axisRight,
  addRight,
  sphLeft,
  cylLeft,
  axisLeft,
  addLeft,
  pd,
  lensBrand,
  lensCoating,
  frameDetails,
  sunglassBrand,
  sunglassModel,
  sunglassColor,
  contactBrand,
  quantity,
  serviceDescription,
  lensNote,
  productDetails,
  totalAmount,
  advanceAmount,
}) {
  // Normalize phone for consistent document IDs
  const phone = normalizePhone(customerPhone);
  if (!phone) throw new Error('Phone number is required');

  // 1. Upsert customer -------------------------------------------------------
  const customerRef = doc(customersCol, phone);
  
  // Use merge:true to update or create customer without needing to fetch first, completely offline-safe.
  setDoc(customerRef, {
    name: (customerName || '').toLowerCase(),
    displayName: customerName || '',
    ...(customerEmail ? { email: customerEmail } : {}),
    ...(customerAddress ? { address: customerAddress } : {}),
  }, { merge: true }).catch(console.error);

  // 2. Counter increment (Offline compatible: removed transaction) -----------
  const countersSnap = await getDoc(countersDoc);
  let currentTotal = 0;
  if (countersSnap.exists()) {
    currentTotal = countersSnap.data().totalOrders ?? 0;
  }
  const nextId = currentTotal + 1;

  // Fire and forget cache updates so it doesn't block while offline
  setDoc(countersDoc, { totalOrders: nextId }, { merge: true }).catch(console.error);

  // 3. Create the order document ----------------------------------------------
  const orderRef = doc(ordersCol);
  setDoc(orderRef, {
    orderType: orderType || 'prescription',
    orderSequenceId: nextId,
    customerPhone: phone,
    customerName: customerName || '',
    customerEmail: customerEmail || '',
    customerAddress: customerAddress || '',
    sphRight: sphRight ?? null,
    cylRight: cylRight ?? null,
    axisRight: axisRight ?? null,
    addRight: addRight ?? null,
    sphLeft: sphLeft ?? null,
    cylLeft: cylLeft ?? null,
    axisLeft: axisLeft ?? null,
    addLeft: addLeft ?? null,
    pd: pd ?? null,
    lensBrand: lensBrand ?? '',
    lensCoating: lensCoating ?? '',
    frameDetails: frameDetails ?? '',
    sunglassBrand: sunglassBrand ?? '',
    sunglassModel: sunglassModel ?? '',
    sunglassColor: sunglassColor ?? '',
    contactBrand: contactBrand ?? '',
    quantity: quantity ?? '',
    serviceDescription: serviceDescription ?? '',
    lensNote: lensNote ?? '',
    productDetails: productDetails ?? '',
    totalAmount: Number(totalAmount) || 0,
    advanceAmount: Number(advanceAmount) || 0,
    orderDate: Timestamp.now(),
    status: 'Pending',
  }).catch(console.error);

  // 4. Return an object immediately so UI updates
  return { orderSequenceId: nextId };
}

// ─── updateOrderStatus ───────────────────────────────────────────────────────
export async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(ordersCol, orderId);
  const updateData = {
    status: newStatus,
    updatedAt: Timestamp.now(),
  };
  // Record the delivery timestamp when status changes to Delivered
  if (newStatus === 'Delivered') {
    updateData.deliveredAt = Timestamp.now();
  }
  updateDoc(orderRef, updateData).catch(console.error);
}

// ─── deleteOrder ─────────────────────────────────────────────────────────────
// Permanently deletes an order document from Firestore.
export async function deleteOrder(orderId) {
  const orderRef = doc(ordersCol, orderId);
  deleteDoc(orderRef).catch(console.error);
}

// ─── searchCustomers ─────────────────────────────────────────────────────────
// Searches by exact-prefix phone number OR case-insensitive name prefix.
// Now includes a fallback exact-match lookup for phone numbers.
export async function searchCustomers(searchQuery) {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return [];
  }

  const trimmed = searchQuery.trim();
  const normalized = normalizePhone(trimmed);
  const lowerQuery = trimmed.toLowerCase();
  
  const queries = [];
  
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

  const numericQuery = parseInt(trimmed, 10);
  if (!isNaN(numericQuery) && numericQuery > 0) {
    queries.push(
      getDocs(
        query(ordersCol, where('orderSequenceId', '==', numericQuery), limit(3))
      ).then(async (orderSnap) => {
        if (!orderSnap.empty) {
          const customerDocs = [];
          for (const orderDoc of orderSnap.docs) {
            const phone = orderDoc.data().customerPhone;
            if (phone) {
              const cSnap = await getDoc(doc(customersCol, phone));
              if (cSnap.exists()) customerDocs.push(cSnap);
            }
          }
          return { docs: customerDocs };
        }
        return { docs: [] };
      })
    );
  }

  const snaps = await Promise.all(queries);
  let customerDocs = snaps.flatMap(snap => snap.docs);
  
  const uniqueDocs = [];
  const seen = new Set();
  for (const docSnap of customerDocs) {
    if (!seen.has(docSnap.id)) {
      seen.add(docSnap.id);
      uniqueDocs.push(docSnap);
    }
  }

  // Fallback: try exact document lookup if prefix search returned nothing
  if (uniqueDocs.length === 0 && normalized.length >= 7) {
    const exactRef = doc(customersCol, normalized);
    const exactSnap = await getDoc(exactRef);
    if (exactSnap.exists()) {
      uniqueDocs.push(exactSnap);
    }
  }

  return uniqueDocs.map((d) => ({
    phone: d.id,
    ...d.data(),
  }));
}

// ─── getOrdersByCustomerPhone ────────────────────────────────────────────────
export async function getOrdersByCustomerPhone(phone) {
  const normalized = normalizePhone(phone);
  const q = query(
    ordersCol,
    where('customerPhone', '==', normalized)
  );

  const snap = await getDocs(q);
  const orders = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  
  // Sort by orderDate descending in memory to avoid needing a composite index
  return orders.sort((a, b) => {
    const timeA = a.orderDate?.toMillis ? a.orderDate.toMillis() : new Date(a.orderDate).getTime();
    const timeB = b.orderDate?.toMillis ? b.orderDate.toMillis() : new Date(b.orderDate).getTime();
    return timeB - timeA;
  });
}

// ─── Expenses ────────────────────────────────────────────────────────────────
const expensesCol = collection(db, 'expenses');

export async function addExpense({ category, description, amount }) {
  if (!category) throw new Error('Category is required');
  if (!amount || isNaN(amount)) throw new Error('Valid amount is required');

  const docRef = doc(expensesCol);
  setDoc(docRef, {
    category,
    description: description || '',
    amount: Number(amount),
    date: Timestamp.now(),
  }).catch(console.error);

  return { id: docRef.id };
}

export async function deleteExpense(expenseId) {
  const expenseRef = doc(expensesCol, expenseId);
  deleteDoc(expenseRef).catch(console.error);
}

// ─── updateCustomer ──────────────────────────────────────────────────────────
// Updates a customer's details (name, email, address) in the customers collection.
export async function updateCustomer(phone, updates) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Phone number is required');
  const customerRef = doc(customersCol, normalized);
  const updateData = {};
  if (updates.name !== undefined) {
    updateData.name = (updates.name || '').toLowerCase();
    updateData.displayName = updates.name || '';
  }
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.address !== undefined) updateData.address = updates.address;
  updateData.updatedAt = Timestamp.now();
  await setDoc(customerRef, updateData, { merge: true });
}

// ─── updateOrderDetails ──────────────────────────────────────────────────────
// Updates specific fields on an order (e.g. prescription power, address, advance).
export async function updateOrderDetails(orderId, updates) {
  const orderRef = doc(ordersCol, orderId);
  await updateDoc(orderRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// ─── getAllCustomers ─────────────────────────────────────────────────────────
// Fetches all customers from Firestore.
export async function getAllCustomers() {
  const snap = await getDocs(query(customersCol, limit(500)));
  return snap.docs.map((d) => ({
    phone: d.id,
    ...d.data(),
  }));
}
