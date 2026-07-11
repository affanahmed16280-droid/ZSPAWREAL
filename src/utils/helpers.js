/**
 * Format a numeric amount as USD currency (no decimals).
 * @param {number} amount
 * @returns {string} e.g. "$1,250"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
}

/**
 * Format a Firestore Timestamp (or JS Date / ISO string) into a human-readable
 * date-time string.
 * @param {import('firebase/firestore').Timestamp | Date | string | null} timestamp
 * @returns {string} e.g. "Jul 11, 2026, 12:26 PM"
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Short date format (month + day only).
 * @param {import('firebase/firestore').Timestamp | Date | string | null} timestamp
 * @returns {string} e.g. "Jul 11"
 */
export function formatDateShort(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Return a time-of-day greeting string.
 * @returns {'Good Morning' | 'Good Afternoon' | 'Good Evening'}
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Validate a phone number (7–15 digits, ignoring spaces and dashes).
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhone(phone) {
  return /^\d{7,15}$/.test(phone.replace(/[\s-]/g, ''));
}
