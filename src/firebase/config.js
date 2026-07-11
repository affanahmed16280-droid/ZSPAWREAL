import { initializeApp } from 'firebase/app';
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
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  Timestamp,
  startAt,
  endAt,
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

export { db };

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
//   4. Return the sequential ID.
export async function createOrder({
  customerPhone,
  customerName,
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
  totalAmount,
}) {
  // 1. Upsert customer -------------------------------------------------------
  const customerRef = doc(customersCol, customerPhone);
  const customerSnap = await getDoc(customerRef);

  if (!customerSnap.exists()) {
    await setDoc(customerRef, {
      name: customerName.toLowerCase(),
      displayName: customerName,
      createdAt: Timestamp.now(),
    });
  }

  // 2. Atomic counter increment inside a transaction -------------------------
  const sequenceId = await runTransaction(db, async (transaction) => {
    const countersSnap = await transaction.get(countersDoc);

    let currentTotal = 0;
    if (countersSnap.exists()) {
      currentTotal = countersSnap.data().totalOrders ?? 0;
    }

    const nextId = currentTotal + 1;

    transaction.set(
      countersDoc,
      { totalOrders: nextId },
      { merge: true },
    );

    // 3. Create the order document inside the same transaction ----------------
    const orderRef = doc(ordersCol);
    transaction.set(orderRef, {
      orderSequenceId: nextId,
      customerPhone,
      customerName,
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
      totalAmount: Number(totalAmount) || 0,
      orderDate: Timestamp.now(),
      status: 'Pending',
    });

    return nextId;
  });

  // 4. Return the sequential ID -----------------------------------------------
  return sequenceId;
}

// ─── updateOrderStatus ───────────────────────────────────────────────────────
export async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(ordersCol, orderId);
  await updateDoc(orderRef, {
    status: newStatus,
    updatedAt: Timestamp.now(),
  });
}

// ─── searchCustomers ─────────────────────────────────────────────────────────
// Searches by exact-prefix phone number OR case-insensitive name prefix.
export async function searchCustomers(searchQuery) {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return [];
  }

  const trimmed = searchQuery.trim();
  let q;

  const isPhone = /^\d/.test(trimmed) && trimmed.length >= 3;

  if (isPhone) {
    // Phone search – doc IDs are phone numbers
    q = query(
      customersCol,
      where('__name__', '>=', trimmed),
      where('__name__', '<=', trimmed + '\uf8ff'),
      limit(20),
    );
  } else {
    // Name search – the `name` field is stored in lowercase
    const lowerQuery = trimmed.toLowerCase();
    q = query(
      customersCol,
      where('name', '>=', lowerQuery),
      where('name', '<=', lowerQuery + '\uf8ff'),
      limit(20),
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    phone: d.id,
    ...d.data(),
  }));
}

// ─── getOrdersByCustomerPhone ────────────────────────────────────────────────
export async function getOrdersByCustomerPhone(phone) {
  const q = query(
    ordersCol,
    where('customerPhone', '==', phone),
    orderBy('orderDate', 'desc'),
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}
