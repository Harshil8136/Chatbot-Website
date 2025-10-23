// Date utilities
export function parseISODate(input) {
  const date = new Date(input);
  return isNaN(date) ? null : date;
}

export function nightsBetween(checkin, checkout) {
  const ms = checkout - checkin;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function ensureValidRange(checkinStr, checkoutStr) {
  const inDate = parseISODate(checkinStr);
  const outDate = parseISODate(checkoutStr);
  if (!inDate || !outDate) return { ok: false, error: 'Please select valid dates.' };
  if (outDate <= inDate) return { ok: false, error: 'Check-out must be after check-in.' };
  return { ok: true, checkin: inDate, checkout: outDate };
}
