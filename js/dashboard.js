/**
 * dashboard.js — Welfmart User Dashboard
 * ========================================
 * Pulls user context, validates auth, and renders order history.
 */

'use strict';

import { getCurrentUser, storageGet } from './utils/storage.js';
import { formatIDR } from './utils/pricing.js';

/* ── Initialization ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();

  // Route Protection: If not logged in, boot to auth page
  if (!user) {
    window.location.replace('auth.html?mode=login');
    return;
  }

  // Populate User Profile
  document.getElementById('dash-avatar').textContent = user.avatarInitials;
  document.getElementById('dash-name').textContent = user.name;
  document.getElementById('dash-role').textContent = user.role;

  renderOrderHistory(user);
});

/* ── Order History Rendering ─────────────────────────────── */
function renderOrderHistory(user) {
  const allOrders = storageGet('orders', []);
  
  // Filter for just this user's orders
  const myOrders = allOrders.filter(o => o.userId === user.id);
  
  const emptyState = document.getElementById('dash-empty');
  const ordersList = document.getElementById('dash-orders-list');

  // Calculate Lifetime Stats dynamically
  const totalSpent = myOrders.reduce((sum, o) => sum + o.financials.total, 0);
  document.getElementById('dash-order-count').textContent = myOrders.length;
  document.getElementById('dash-total-spent').textContent = formatIDR(totalSpent);

  if (myOrders.length === 0) {
    emptyState.style.display = 'block';
    ordersList.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  ordersList.style.display = 'flex';

  // Render cards
  ordersList.innerHTML = myOrders.map(order => generateOrderCard(order)).join('');
}

/* ── DOM Generators ──────────────────────────────────────── */
function generateOrderCard(order) {
  // Format Date (e.g., "14 Oct 2026, 10:30")
  const dateObj = new Date(order.timestamp);
  const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Map status to styling badge
  let badgeClass = 'badge-slate';
  if (order.status === 'Preparing') badgeClass = 'badge-warning';
  if (order.status === 'Ready')     badgeClass = 'badge-info';
  if (order.status === 'Completed') badgeClass = 'badge-success';

  // Generate Items Preview
  const itemsHtml = order.items.map(item => `
    <div class="order-item-row">
      <div class="order-item-row__emoji">${item.emoji}</div>
      <span class="order-item-row__name">${item.name}</span>
      <span class="order-item-row__qty">× ${item.qty}</span>
    </div>
  `).join('');

  // Queue Fee / Discount logic strings (only show if applicable)
  const discountHtml = order.financials.isDiscountEligible 
    ? `<div class="order-total-row text-success"><span>Discount</span> <span>-${formatIDR(order.financials.discount)}</span></div>` 
    : '';
    
  const queueFeeHtml = order.financials.isQueueFeeApplied 
    ? `<div class="order-total-row text-rust"><span>Queue Fee</span> <span>+${formatIDR(order.financials.queueFee)}</span></div>` 
    : '';

  // Footer Method Info
  const methodIcon = order.method === 'Queue' ? '⏱️' : '📍';
  const methodLabel = order.method === 'Queue' 
    ? `Online Queue (Pick up at window)` 
    : `Delivery to: ${order.location}`;

  return `
    <article class="order-card">
      <div class="order-card__header">
        <div class="order-card__meta">
          <span class="order-card__id">${order.id}</span>
          <span class="order-card__date">${dateStr}, ${timeStr}</span>
        </div>
        <span class="badge ${badgeClass}">● ${order.status}</span>
      </div>

      <div class="order-card__body">
        <div class="order-items-preview">
          ${itemsHtml}
        </div>
        
        <div class="order-totals-box">
          <div class="order-total-row">
            <span>Subtotal</span>
            <span>${formatIDR(order.financials.subtotal)}</span>
          </div>
          ${discountHtml}
          ${queueFeeHtml}
          <div class="order-total-row final">
            <span>Total</span>
            <span>${formatIDR(order.financials.total)}</span>
          </div>
        </div>
      </div>

      <div class="order-card__footer">
        <span>${methodIcon}</span>
        <span>${methodLabel}</span>
      </div>
    </article>
  `;
}