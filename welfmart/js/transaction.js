/**
 * transaction.js — Welfmart Checkout Logic
 * ==========================================
 * Orchestrates checkout flow, strictly utilizing pricing.js for 
 * business rules (discounts and peak queue fees).
 */

'use strict';

import { storageGet, storageSet, getCurrentUser } from './utils/storage.js';
import { calculateOrderTotal, formatIDR, formatDiscountLabel } from './utils/pricing.js';
import { updateCartBadge, showToast } from './app.js';

/* ── State ───────────────────────────────────────────────── */
let cart = [];
let user = null;
let isOnlineQueue = false;
let orderSummary = null;

/* ── Initialization ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  cart = storageGet('cart', []);
  user = getCurrentUser();

  const checkoutEmpty = document.getElementById('checkout-empty');
  const checkoutContent = document.getElementById('checkout-content');

  // Verify Cart State
  if (cart.length === 0) {
    checkoutEmpty.style.display = 'block';
    checkoutContent.style.display = 'none';
    return;
  }

  checkoutEmpty.style.display = 'none';
  checkoutContent.style.display = 'grid';

  initMethodToggle();
  renderSummaryItems();
  updateTotals();
  initSubmission();
});

/* ── Method Toggles (Delivery vs Queue) ──────────────────── */
function initMethodToggle() {
  const radios = document.querySelectorAll('input[name="orderMethod"]');
  const deliveryDetails = document.getElementById('delivery-details');
  const queueDetails = document.getElementById('queue-details');
  const deliveryRoomInput = document.getElementById('deliveryRoom');

  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      // Manage visual selection
      document.querySelectorAll('.method-option').forEach(el => el.classList.remove('selected'));
      e.target.closest('.method-option').classList.add('selected');

      // Update local state
      isOnlineQueue = e.target.value === 'queue';

      // Toggle dynamic form fields
      if (isOnlineQueue) {
        deliveryDetails.style.display = 'none';
        queueDetails.style.display = 'flex';
        deliveryRoomInput.required = false;
      } else {
        deliveryDetails.style.display = 'flex';
        queueDetails.style.display = 'none';
        deliveryRoomInput.required = true;
      }

      // Re-run the pricing engine
      updateTotals();
    });
  });
}

/* ── Render Summary Items ────────────────────────────────── */
function renderSummaryItems() {
  const container = document.getElementById('summary-items');
  if (!container) return;

  container.innerHTML = cart.map(item => `
    <div class="summary-item">
      <div class="summary-item__visual">${item.emoji}</div>
      <div class="summary-item__details">
        <div class="summary-item__name">${item.name}</div>
        <div class="summary-item__meta">${formatIDR(item.price)} × ${item.qty}</div>
      </div>
      <div class="summary-item__price">${formatIDR(item.price * item.qty)}</div>
    </div>
  `).join('');
}

/* ── The Brains: Calculate & Update Totals ───────────────── */
function updateTotals() {
  // 1. Calculate raw subtotal
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // 2. Delegate to business rules engine (pricing.js)
  // Passing userRole gracefully handles logged-out state (undefined -> 0% discount)
  orderSummary = calculateOrderTotal({
    subtotal: subtotal,
    userRole: user?.role,
    isOnlineQueue: isOnlineQueue
  });

  // 3. Update DOM
  document.getElementById('summary-subtotal').textContent = formatIDR(orderSummary.subtotal);
  document.getElementById('summary-total').textContent = formatIDR(orderSummary.total);

  // Discount Row
  const rowDiscount = document.getElementById('row-discount');
  if (orderSummary.isDiscountEligible) {
    rowDiscount.style.display = 'flex';
    document.getElementById('summary-discount').textContent = `-${formatIDR(orderSummary.discount)}`;
    document.getElementById('discount-percent').textContent = formatDiscountLabel(orderSummary.discountRate).replace('%', '');
  } else {
    rowDiscount.style.display = 'none';
  }

  // Queue Fee Row
  const rowFee = document.getElementById('row-queue-fee');
  if (orderSummary.isQueueFeeApplied) {
    rowFee.style.display = 'flex';
    document.getElementById('summary-queue-fee').textContent = `+${formatIDR(orderSummary.queueFee)}`;
  } else {
    rowFee.style.display = 'none';
  }
}

/* ── Form Submission ─────────────────────────────────────── */
function initSubmission() {
  const btnSubmit = document.getElementById('btn-submit-order');
  const authWarning = document.getElementById('auth-warning');
  
  btnSubmit.addEventListener('click', (e) => {
    e.preventDefault();

    // 1. Validate Auth
    if (!user) {
      authWarning.style.display = 'flex';
      setTimeout(() => authWarning.style.display = 'none', 5000);
      window.scrollTo({ top: authWarning.offsetTop - 100, behavior: 'smooth' });
      return;
    }

    // 2. Validate Form (HTML5 Validation via fake button click trick)
    const form = document.getElementById('checkout-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // 3. Construct Payload
    const notes = document.getElementById('orderNotes').value;
    const room = document.getElementById('deliveryRoom').value;
    
    // Simulate an order ID
    const orderId = 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const newOrder = {
      id: orderId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      items: [...cart],
      method: isOnlineQueue ? 'Queue' : 'Delivery',
      location: isOnlineQueue ? 'Canteen Window' : room,
      notes: notes,
      financials: orderSummary,
      status: 'Pending', // Pending -> Preparing -> Ready -> Completed
      timestamp: new Date().toISOString()
    };

    // 4. Save to mock DB
    const orders = storageGet('orders', []);
    orders.unshift(newOrder); // Add to beginning of array
    storageSet('orders', orders);

    // 5. Cleanup & Redirect
    storageSet('cart', []);
    updateCartBadge(); // from app.js
    
    showToast('Order placed successfully!', 'success');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  });
}