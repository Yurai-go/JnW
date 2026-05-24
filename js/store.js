/**
 * store.js — Welfmart Menu & Catalog Logic
 * ==========================================
 * Handles product rendering, category filtering, cart management,
 * and floating summary updates.
 */

'use strict';

import { runSeeder } from './utils/seed.js'; 
import { storageGet, storageSet } from './utils/storage.js';
import { formatIDR } from './utils/pricing.js';
import { updateCartBadge, showToast } from './app.js';

/* ── State ───────────────────────────────────────────────── */
let products = [];
let cart = [];
let currentCategory = 'All';

/* ── DOM Elements ────────────────────────────────────────── */
const gridEl = document.getElementById('product-grid');
const emptyStateEl = document.getElementById('store-empty-state');
const filterList = document.getElementById('category-filters');
const floatingCart = document.getElementById('floating-cart');
const cartCountEl = document.getElementById('floating-cart-count');
const cartTotalEl = document.getElementById('floating-cart-total');

/* ── Initialization ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Run the seeder to make sure mock DB is populated
  runSeeder();

  // Load data from the seeded catalog
  products = storageGet('products', []);
  cart = storageGet('cart', []);

  initFilters();
  initGridEvents();
  renderStore();
  updateFloatingCart(); // <-- Added to show cart status on hard refresh
});

/* ── Filtering ───────────────────────────────────────────── */
function initFilters() {
  if (!filterList) return;
  
  filterList.addEventListener('click', (e) => {
    const btn = e.target.closest('.store-filter-btn');
    if (!btn) return;

    // Update active UI state
    document.querySelectorAll('.store-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update state and re-render
    currentCategory = btn.dataset.category;
    renderStore();
  });
}

/* ── Rendering ───────────────────────────────────────────── */
function renderStore() {
  if (!gridEl) return;

  // Filter products based on active sidebar category
  const filteredProducts = products.filter(product => {
    if (currentCategory === 'All') return true;
    return product.category.toLowerCase() === currentCategory.toLowerCase();
  });

  // Handle empty state display toggle
  if (filteredProducts.length === 0) {
    gridEl.innerHTML = '';
    if (emptyStateEl) emptyStateEl.style.display = 'block';
    return;
  }

  if (emptyStateEl) emptyStateEl.style.display = 'none';

  // Map products array to card templates
  gridEl.innerHTML = filteredProducts.map(product => {
    // Check if item is already in cart to show quantities if needed
    const cartItem = cart.find(item => item.id === product.id);
    const quantity = cartItem ? cartItem.qty : 0;

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-card__image-placeholder">${product.emoji || '🍽️'}</div>
        <div class="product-card__content">
          <span class="product-card__category">${product.category}</span>
          <h4 class="product-card__title">${product.name}</h4>
          <p class="product-card__description">${product.description || ''}</p>
          
          <div class="product-card__footer">
            <span class="product-card__price">${formatIDR(product.price)}</span>
            
            ${quantity > 0 ? `
              <div class="product-card__quantity-controls">
                <button class="btn-qty-minus" data-id="${product.id}">-</button>
                <span class="product-card__qty-value">${quantity}</span>
                <button class="btn-qty-plus" data-id="${product.id}">+</button>
              </div>
            ` : `
              <button class="btn-add-to-cart btn-primary" data-id="${product.id}">
                Add to Cart
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ── Cart Management ─────────────────────────────────────── */
function initGridEvents() {
  if (!gridEl) return;

  gridEl.addEventListener('click', (e) => {
    
    // Add to Cart (Fixed class matching template line 99)
    const addBtn = e.target.closest('.btn-add-to-cart');
    if (addBtn) {
      const id = addBtn.dataset.id;
      updateCartQuantity(id, 1, true);
      return;
    }

    // Increment (Fixed class matching template line 94)
    const incBtn = e.target.closest('.btn-qty-plus');
    if (incBtn) {
      updateCartQuantity(incBtn.dataset.id, 1);
      return;
    }

    // Decrement (Fixed class matching template line 92)
    const decBtn = e.target.closest('.btn-qty-minus');
    if (decBtn) {
      updateCartQuantity(decBtn.dataset.id, -1);
      return;
    }
  });
}

/**
 * Updates an item's quantity in the cart.
 */
function updateCartQuantity(id, change, isInitialAdd = false) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const itemIndex = cart.findIndex(item => item.id === id);

  if (itemIndex > -1) {
    // Item exists, update quantity
    const newQty = cart[itemIndex].qty + change;
    
    // Check stock limit
    if (newQty > product.stock) {
      showToast('Not enough stock available', 'warning');
      return;
    }

    if (newQty <= 0) {
      cart.splice(itemIndex, 1); // Remove if 0
    } else {
      cart[itemIndex].qty = newQty;
    }
  } else {
    // New item added
    if (change > 0) {
      cart.push({ ...product, qty: 1 });
      if (isInitialAdd) {
        showToast(`Added ${product.name} to cart`, 'success');
      }
    }
  }

  // Persist and re-render UI components
  storageSet('cart', cart);
  updateCartBadge();
  renderStore();      // Updates item buttons dynamically
  updateFloatingCart(); // <-- Added so the sticky footer calculates values immediately
}

/* ── Floating Summary ────────────────────────────────────── */
function updateFloatingCart() {
  if (!floatingCart) return;

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (totalQty > 0) {
    if (cartCountEl) cartCountEl.textContent = totalQty;
    if (cartTotalEl) cartTotalEl.textContent = formatIDR(totalPrice);
    floatingCart.classList.add('visible');
    
    // Add extra padding to body so content doesn't hide behind floating cart
    document.body.style.paddingBottom = '80px';
  } else {
    floatingCart.classList.remove('visible');
    document.body.style.paddingBottom = '0';
  }
}
// Removed the extra stray closing brace that was breaking the file!