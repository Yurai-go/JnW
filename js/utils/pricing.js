/**
 * pricing.js — Welfmart Business Rules Engine
 * ============================================
 * All pricing logic lives here. Adjust CONFIG values only
 * when business rules change. Never hardcode these values elsewhere.
 *
 * Location: js/utils/pricing.js
 */

'use strict';

/* ── Business Rule Configuration ──────────────────────────── */
export const PRICING_CONFIG = {
  /**
   * Membership discount: roles that qualify and their discount rate.
   * Add new roles here without touching any other file.
   * e.g., to add 'staff': { staff: 0.15 }
   */
  memberDiscounts: {
    teacher:  0.20,   // 20% — teachers / ustadz
    ustadz:   0.20,   // alias kept explicit for clarity
  },

  /**
   * Dynamic queuing fee (IDR) added during online peak-hour bookings.
   * Set to 0 to disable globally.
   */
  queueFee: 2000,

  /**
   * Peak hours (24-h format, inclusive range).
   * Queue fee is only applied within this window.
   */
  peakHours: { start: 10, end: 13 },

  /**
   * Minimum order value (IDR) required for delivery orders.
   */
  minimumOrderDelivery: 10000,
};

/* ── Pure Utility Functions ──────────────────────────────── */

/**
 * Returns the discount rate for a given user role.
 * @param {string} role - User role (e.g., 'teacher', 'student')
 * @returns {number} Discount rate as a decimal (0–1). 0 = no discount.
 */
export function getDiscountRate(role) {
  if (!role) return 0;
  return PRICING_CONFIG.memberDiscounts[role.toLowerCase()] ?? 0;
}

/**
 * Calculates the discount amount for a subtotal given a user role.
 * @param {number} subtotal - Cart subtotal in IDR
 * @param {string} role     - User role
 * @returns {{ rate: number, amount: number, isEligible: boolean }}
 */
export function calculateDiscount(subtotal, role) {
  const rate = getDiscountRate(role);
  return {
    rate,
    amount: Math.floor(subtotal * rate),
    isEligible: rate > 0,
  };
}

/**
 * Determines whether the queue fee applies right now.
 * Uses current system time by default; accepts an override for testing.
 * @param {Date} [now=new Date()] - Optional date override for testing
 * @returns {boolean}
 */
export function isPeakHour(now = new Date()) {
  const hour = now.getHours();
  const { start, end } = PRICING_CONFIG.peakHours;
  return hour >= start && hour <= end;
}

/**
 * Returns the queue fee if applicable (online booking during peak hours).
 * @param {boolean} isOnlineBooking - Whether the user chose online queuing
 * @param {Date}    [now]           - Optional date override for testing
 * @returns {{ fee: number, applied: boolean, reason: string }}
 */
export function calculateQueueFee(isOnlineBooking, now = new Date()) {
  if (!isOnlineBooking) {
    return { fee: 0, applied: false, reason: 'Not an online queue booking.' };
  }
  if (!isPeakHour(now)) {
    return { fee: 0, applied: false, reason: 'Outside peak hours.' };
  }
  return {
    fee: PRICING_CONFIG.queueFee,
    applied: true,
    reason: `Peak-hour online queue fee (${PRICING_CONFIG.peakHours.start}:00–${PRICING_CONFIG.peakHours.end}:59).`,
  };
}

/**
 * Master order total calculator. Single source of truth for all pricing.
 * @param {Object} params
 * @param {number}  params.subtotal       - Sum of (price × qty) for all items
 * @param {string}  params.userRole       - User's role for discount lookup
 * @param {boolean} params.isOnlineQueue  - Whether booking a queue online
 * @param {Date}    [params.now]          - Optional date override for testing
 * @returns {OrderSummary}
 */
export function calculateOrderTotal({ subtotal, userRole, isOnlineQueue, now }) {
  const discount  = calculateDiscount(subtotal, userRole);
  const queue     = calculateQueueFee(isOnlineQueue, now);
  const afterDiscount = subtotal - discount.amount;
  const total     = afterDiscount + queue.fee;

  return {
    subtotal,
    discount: discount.amount,
    discountRate: discount.rate,
    isDiscountEligible: discount.isEligible,
    queueFee: queue.fee,
    isQueueFeeApplied: queue.applied,
    queueFeeReason: queue.reason,
    total: Math.max(total, 0),    // guard against negative totals
  };
}

/**
 * Formats an IDR currency value for display.
 * @param {number} amount
 * @returns {string} e.g., "Rp 15.000"
 */
export function formatIDR(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/**
 * Formats a discount rate as a human-readable percentage string.
 * @param {number} rate - Decimal rate (e.g., 0.20)
 * @returns {string}    e.g., "20%"
 */
export function formatDiscountLabel(rate) {
  return `${Math.round(rate * 100)}%`;
}