/**
 * admin.js — Welfmart Admin CMS Dashboard
 * =========================================
 * Handles live orders, inventory management, and role verification.
 * Strictly protected route.
 */

'use strict';

import { runSeeder } from './utils/seed.js';
import { getCurrentUser, storageGet, storageSet, clearSession } from './utils/storage.js';
import { formatIDR } from './utils/pricing.js';
import { showToast } from './app.js';

/* ── Initialization & Route Protection ───────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  runSeeder();

  const user = getCurrentUser();

  // CRITICAL: Route Protection
  if (!user || user.role !== 'admin') {
    window.location.replace('index.html');
    return;
  }

  document.getElementById('nav-user-name').textContent = user.name.split(' ')[0];

  // Custom logout behavior for admin to redirect to index instead of staying on admin page
  document.getElementById('nav-logout-btn')?.addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  initTabs();
  initInventoryForm();
  renderOrders();
  renderInventory();
  renderUsers();
});

/* ── Tab Switching Logic ─────────────────────────────────── */
function initTabs() {
  const tabs = document.querySelectorAll('.admin-tab-btn');
  const panels = document.querySelectorAll('.admin-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');

      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.dataset.target);
      if (targetPanel) {
        targetPanel.style.display = 'block';
      }
    });
  });
}

/* ── Utility Helpers ─────────────────────────────────────── */
function persistCartFromProducts(productIdsToKeep) {
  const cart = storageGet('cart', []);
  const filteredCart = cart.filter(item => productIdsToKeep.has(item.id));

  if (filteredCart.length !== cart.length) {
    storageSet('cart', filteredCart);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── 1. Live Orders Management ───────────────────────────── */
const STATUS_FLOW = {
  'Pending': 'Preparing',
  'Preparing': 'Ready',
  'Ready': 'Completed',
  'Completed': null
};

function renderOrders() {
  const orders = storageGet('orders', []);
  const tbody = document.getElementById('table-body-orders');

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-muted">No orders found.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const nextStatus = STATUS_FLOW[order.status];

    let badgeClass = 'badge-slate';
    if (order.status === 'Preparing') badgeClass = 'badge-warning';
    if (order.status === 'Ready') badgeClass = 'badge-info';
    if (order.status === 'Completed') badgeClass = 'badge-success';

    const actionBtn = nextStatus
      ? `<button class="btn btn-primary btn-sm js-update-status" data-id="${order.id}" data-next="${nextStatus}">Mark as ${nextStatus}</button>`
      : '<span class="badge badge-success">Finished</span>';

    return `
      <tr>
        <td style="font-family: monospace;">${order.id}</td>
        <td>
          <strong>${order.userName}</strong><br>
          <span style="font-size: 10px; color: var(--color-slate-muted);">${order.userRole.toUpperCase()}</span>
        </td>
        <td>${order.method === 'Queue' ? '⏱️ Queue' : `📍 ${order.location}`}</td>
        <td><strong>${formatIDR(order.financials.total)}</strong></td>
        <td><span class="badge ${badgeClass}">${order.status}</span></td>
        <td>${actionBtn}</td>
      </tr>`;
  }).join('');

  document.querySelectorAll('.js-update-status').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = e.target.closest('.js-update-status').dataset.id;
      const nextStatus = e.target.closest('.js-update-status').dataset.next;

      const allOrders = storageGet('orders', []);
      const orderIndex = allOrders.findIndex(o => o.id === orderId);

      if (orderIndex > -1) {
        allOrders[orderIndex].status = nextStatus;
        storageSet('orders', allOrders);
        showToast(`Order ${orderId} updated to ${nextStatus}.`);
        renderOrders();
      }
    });
  });

  document.querySelector('.js-refresh-orders')?.addEventListener('click', renderOrders);
}

/* ── 2. Inventory Management ─────────────────────────────── */
function initInventoryForm() {
  const form = document.getElementById('inventory-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const name = formData.get('name').toString().trim();
    const category = formData.get('category').toString();
    const price = Number(formData.get('price'));
    const emoji = formData.get('emoji').toString().trim() || '🍽️';
    const imageUrl = formData.get('image') ? formData.get('image').toString().trim() : '';
    const imageFile = formData.get('imageFile');
    const imageFileUrl = imageFile && imageFile.size ? await readFileAsDataURL(imageFile) : null;
    const stock = Number(formData.get('stock'));
    const description = formData.get('description').toString().trim();

    if (!name || !category || Number.isNaN(price) || price <= 0 || Number.isNaN(stock) || stock < 0) {
      showToast('Please enter a valid name, category, price, and stock.', 'danger');
      return;
    }

    const allProducts = storageGet('products', []);
    const image = imageFileUrl || imageUrl || undefined;

    allProducts.push({
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      category,
      price: Math.round(price),
      emoji,
      image,
      description,
      stock: Math.round(stock),
      available: stock > 0,
      createdAt: new Date().toISOString()
    });

    storageSet('products', allProducts);
    showToast(`Added ${name} to the menu.`, 'success');
    form.reset();
    renderInventory();
  });
}

function renderInventory() {
  const products = storageGet('products', []);
  const tbody = document.getElementById('table-body-inventory');

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-muted">No menu items found. Add one using the form above.</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => {
    const isOutOfStock = !p.available || p.stock === 0;
    const stockBadge = isOutOfStock
      ? '<span class="badge badge-danger">Out of Stock</span>'
      : '<span class="badge badge-success">Available</span>';

    const toggleAction = isOutOfStock ? 'Set Available' : 'Set Out of Stock';

    return `
      <tr>
        <td>
          <div class="td-item-name">
            ${p.image ? `<img src="${p.image}" alt="${p.name}" class="td-thumb" onerror="this.style.display='none'"/>` : `<span>${p.emoji}</span>`}
            <span>${p.name}</span>
          </div>
        </td>
        <td>${p.category}</td>
        <td style="font-family: monospace;">${formatIDR(p.price)}</td>
        <td>${stockBadge}</td>
        <td>
          <div class="admin-action-group">
            <button class="btn btn-primary btn-sm js-open-edit" data-id="${p.id}">Edit</button>
            <button class="btn btn-secondary btn-sm js-toggle-stock" data-id="${p.id}" style="color: var(--color-slate); border-color: var(--color-slate-faint);">
              ${toggleAction}
            </button>
            <button class="btn btn-ghost btn-sm js-delete-item" data-id="${p.id}" data-name="${p.name}" style="color: var(--color-danger); border-color: rgba(192,57,43,.3);">
              Delete
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  document.querySelectorAll('.js-toggle-stock').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.closest('.js-toggle-stock').dataset.id;
      const allProducts = storageGet('products', []);
      const product = allProducts.find(p => p.id === productId);

      if (!product) return;

      if (!product.available || product.stock === 0) {
        product.stock = 50;
        product.available = true;
      } else {
        product.stock = 0;
        product.available = false;
      }

      storageSet('products', allProducts);
      showToast(`${product.name} inventory status updated.`);
      renderInventory();
    });
  });

  document.querySelectorAll('.js-update-price').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.closest('.js-update-price').dataset.id;
      const currentPrice = e.target.closest('.js-update-price').dataset.price;
      const allProducts = storageGet('products', []);
      const productIndex = allProducts.findIndex(p => p.id === productId);

      if (productIndex === -1) return;

      const newPrice = prompt(`Enter new price for ${allProducts[productIndex].name} (IDR):`, currentPrice);

      if (newPrice === null) return;
      if (!newPrice.trim() || isNaN(newPrice)) {
        showToast('Invalid price entered. Must be a number.', 'danger');
        return;
      }

      allProducts[productIndex].price = parseInt(newPrice, 10);
      storageSet('products', allProducts);
      showToast(`Price updated for ${allProducts[productIndex].name}.`, 'success');
      renderInventory();
    });
  });

  document.querySelectorAll('.js-delete-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.js-delete-item');
      const productId = deleteBtn.dataset.id;
      const productName = deleteBtn.dataset.name;

      if (!confirm(`Delete ${productName} from the menu? This will also remove it from the saved cart.`)) {
        return;
      }

      const allProducts = storageGet('products', []);
      const filteredProducts = allProducts.filter(p => p.id !== productId);
      const remainingIds = new Set(filteredProducts.map(p => p.id));

      storageSet('products', filteredProducts);
      persistCartFromProducts(remainingIds);
      showToast(`${productName} was deleted.`, 'warning');
      renderInventory();
    });
  });

  // Open Edit modal handler
  document.querySelectorAll('.js-open-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.closest('.js-open-edit').dataset.id;
      openEditModal(productId);
    });
  });
}

/* ── 3. User Roles & Security ────────────────────────────── */
function renderUsers() {
  const usersObj = storageGet('users', {});
  const users = Object.values(usersObj);
  const tbody = document.getElementById('table-body-users');

  tbody.innerHTML = users.map(u => {
    if (u.role === 'admin') return '';

    const isDiscountRole = u.role === 'teacher' || u.role === 'ustadz';
    const rowClass = isDiscountRole ? 'row-warning' : '';
    const roleBadgeClass = isDiscountRole ? 'badge-rust' : 'badge-slate';

    const demoteBtn = isDiscountRole
      ? `<button class="btn btn-ghost btn-sm js-demote-user" data-email="${u.email}" style="color: var(--color-danger); border-color: rgba(192,57,43,.3);">Demote to Student</button>`
      : '<span style="font-size: 10px; color: var(--color-slate-muted);">Standard Account</span>';

    return `
      <tr class="${rowClass}">
        <td><strong>${u.name}</strong></td>
        <td style="font-family: monospace; font-size: 12px;">${u.email}</td>
        <td><span class="badge ${roleBadgeClass}">${u.role.toUpperCase()}</span></td>
        <td>${demoteBtn}</td>
      </tr>`;
  }).join('');

  document.querySelectorAll('.js-demote-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const email = e.target.closest('.js-demote-user').dataset.email;
      const confirmDemote = confirm(`Are you sure you want to revoke discount privileges for ${email} and change their role to Student?`);

      if (!confirmDemote) return;

      const allUsers = storageGet('users', {});
      if (allUsers[email]) {
        allUsers[email].role = 'student';
        storageSet('users', allUsers);
        showToast(`${allUsers[email].name} has been demoted to Student.`, 'success');
        renderUsers();
      }
    });
  });
}

/* ── Edit Modal Logic ───────────────────────────────────── */
const modalEl = document.getElementById('edit-item-modal');
const modalForm = document.getElementById('edit-item-form');
const modalDeleteBtn = document.getElementById('modal-delete-btn');

function openEditModal(productId) {
  const allProducts = storageGet('products', []);
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  // populate form
  modalForm.elements['id'].value = product.id;
  modalForm.elements['name'].value = product.name || '';
  modalForm.elements['category'].value = product.category || 'Food';
  modalForm.elements['price'].value = product.price || 0;
  modalForm.elements['emoji'].value = product.emoji || '';
  modalForm.elements['image'].value = product.image || '';
  modalForm.elements['stock'].value = product.stock != null ? product.stock : 0;
  modalForm.elements['description'].value = product.description || '';

  modalEl.setAttribute('aria-hidden', 'false');
  modalEl.classList.add('visible');
}

function closeModal() {
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.classList.remove('visible');
}

// backdrop & close buttons
modalEl?.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'close') closeModal();
});

// Save changes
modalForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(modalForm);
  const id = fd.get('id');
  const allProducts = storageGet('products', []);
  const idx = allProducts.findIndex(p => p.id === id);
  if (idx === -1) return;

  const name = fd.get('name').toString().trim();
  const category = fd.get('category').toString();
  const price = Number(fd.get('price')) || 0;
  const emoji = fd.get('emoji').toString().trim() || undefined;
  const imageUrl = fd.get('image').toString().trim() || '';
  const imageFile = fd.get('imageFile');
  const imageFileUrl = imageFile && imageFile.size ? await readFileAsDataURL(imageFile) : null;
  const image = imageFileUrl || imageUrl || undefined;
  const stock = Number(fd.get('stock')) || 0;
  const description = fd.get('description').toString().trim() || '';

  if (!name) { showToast('Name cannot be empty.', 'danger'); return; }

  allProducts[idx] = {
    ...allProducts[idx],
    name,
    category,
    price: Math.round(price),
    emoji,
    image,
    stock: Math.round(stock),
    available: stock > 0,
    description,
  };

  storageSet('products', allProducts);
  showToast('Item updated.', 'success');
  closeModal();
  renderInventory();
});

// Delete from modal
modalDeleteBtn?.addEventListener('click', () => {
  const id = modalForm.elements['id'].value;
  if (!confirm('Delete this item? This action cannot be undone.')) return;
  const allProducts = storageGet('products', []);
  const filtered = allProducts.filter(p => p.id !== id);
  storageSet('products', filtered);
  persistCartFromProducts(new Set(filtered.map(p => p.id)));
  showToast('Item deleted.', 'warning');
  closeModal();
  renderInventory();
});