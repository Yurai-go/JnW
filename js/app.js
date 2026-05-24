/**
 * app.js — Welfmart Application Bootstrap
 * =========================================
 * Handles: nav session state, mobile menu, scroll-reveal animations,
 * cart badge updates, and shared UI utilities.
 * Import this on every page (last, before page-specific scripts).
 *
 * Location: js/app.js
 */

'use strict';

import { getCurrentUser, storageGet } from './utils/storage.js';

/* ── DOM Ready ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  updateCartBadge();
});

/* ── Navigation ──────────────────────────────────────────── */
function initNav() {
  const user        = getCurrentUser();
  const hamburger   = document.querySelector('.wm-nav__hamburger');
  const navLinks    = document.querySelector('.wm-nav__links');
  const authArea    = document.getElementById('nav-auth-area');
  const userArea    = document.getElementById('nav-user-area');
  const userNameEl  = document.getElementById('nav-user-name');

  /* Render auth vs. user state */
  if (user && authArea && userArea) {
    authArea.style.display = 'none';
    userArea.style.display = 'flex';
    if (userNameEl) userNameEl.textContent = user.name?.split(' ')[0] || 'Account';
  } else if (authArea && userArea) {
    userArea.style.display = 'none';
    authArea.style.display = 'flex';
  }

  if (navLinks && user?.role === 'admin') {
    const existingAdminLink = navLinks.querySelector('[data-page="admin.html"]');
    if (!existingAdminLink) {
      const adminLink = document.createElement('li');
      adminLink.innerHTML = '<a href="admin.html" class="wm-nav__link" data-page="admin.html">Admin Panel</a>';
      navLinks.appendChild(adminLink);
    }
  }

  /* Mobile hamburger toggle */
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('mobile-open');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      animateHamburger(hamburger, isOpen);
    });

    /* Close on outside click */
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.wm-nav__inner') && navLinks.classList.contains('mobile-open')) {
        navLinks.classList.remove('mobile-open');
        document.body.style.overflow = '';
        animateHamburger(hamburger, false);
      }
    });
  }

  /* Highlight active nav link based on current page */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.wm-nav__link[data-page]').forEach(link => {
    if (link.dataset.page === currentPage) link.classList.add('active');
  });

  /* Logout handler */
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      import('./utils/storage.js').then(({ clearSession }) => {
        clearSession();
        window.location.href = 'index.html';
      });
    });
  }
}

function animateHamburger(btn, isOpen) {
  const [top, mid, bot] = btn.querySelectorAll('span');
  if (isOpen) {
    top.style.transform = 'translateY(7px) rotate(45deg)';
    mid.style.opacity   = '0';
    bot.style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    top.style.transform = '';
    mid.style.opacity   = '';
    bot.style.transform = '';
  }
}

/* ── Cart Badge ──────────────────────────────────────────── */
export function updateCartBadge() {
  const badge = document.querySelector('.wm-nav__cart-badge');
  if (!badge) return;
  const cart  = storageGet('cart', []);
  const count = cart.reduce((sum, item) => sum + (item.qty ?? 1), 0);
  badge.textContent = count > 99 ? '99+' : count;
  badge.classList.toggle('visible', count > 0);
}

/* ── Scroll-Reveal Animations ────────────────────────────── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  /* Use IntersectionObserver if available, else just show all */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => io.observe(el));
  } else {
    els.forEach(el => el.classList.add('visible'));
  }
}

/* ── Toast Notification ──────────────────────────────────── */
/**
 * Shows a temporary toast message.
 * @param {string} message
 * @param {'success'|'danger'|'warning'|'rust'} [type='success']
 * @param {number} [duration=3000]
 */
export function showToast(message, type = 'success', duration = 3000) {
  let container = document.getElementById('wm-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'wm-toast-container';
    container.style.cssText = `
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column; gap: 10px;
      z-index: 9999; pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `alert alert-${type}`;
  toast.style.cssText = `
    pointer-events: all;
    min-width: 260px; max-width: 360px;
    box-shadow: var(--shadow-lg);
    animation: toastIn 300ms ease forwards;
  `;
  toast.textContent = message;

  /* Inject keyframes once */
  if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.textContent = `
      @keyframes toastIn  { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      @keyframes toastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(20px); } }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 300ms ease forwards';
    setTimeout(() => toast.remove(), 310);
  }, duration);
}