/**
 * auth.js — Welfmart Authentication Logic
 * =========================================
 * Handles UI toggles, local storage read/write for user validation,
 * and user session creation.
 */

'use strict';

import { storageGet, storageSet, setCurrentUser } from './utils/storage.js';
import { runSeeder } from './utils/seed.js';

// Ensure the local DB is populated before trying to log in
runSeeder();

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initPasswordToggles();
  initRolePills();
  initForms();
});

/* ── 1. Tab Management ───────────────────────────────────────── */
function initTabs() {
  const btnLogin = document.getElementById('tab-login');
  const btnRegister = document.getElementById('tab-register');
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');
  const banner = document.getElementById('auth-banner');

  const switchTab = (mode) => {
    banner.classList.remove('visible'); // clear errors on switch
    if (mode === 'register') {
      btnLogin.classList.remove('active');
      btnRegister.classList.add('active');
      panelLogin.classList.remove('active');
      panelRegister.classList.add('active');
    } else {
      btnRegister.classList.remove('active');
      btnLogin.classList.add('active');
      panelRegister.classList.remove('active');
      panelLogin.classList.add('active');
    }
  };

  btnLogin.addEventListener('click', () => switchTab('login'));
  btnRegister.addEventListener('click', () => switchTab('register'));

  // Check URL parameters (e.g. auth.html?mode=register)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'register') {
    switchTab('register');
  }
}

/* ── 2. Password Visibility Toggle ───────────────────────────── */
function initPasswordToggles() {
  document.querySelectorAll('.auth-pw-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wrapper = btn.closest('.auth-input-wrapper');
      const input = wrapper.querySelector('input');
      
      if (input.type === 'password') {
        input.type = 'text';
        btn.classList.add('visible');
      } else {
        input.type = 'password';
        btn.classList.remove('visible');
      }
    });
  });
}

/* ── 3. Role Selector Logic ──────────────────────────────────── */
function initRolePills() {
  const pills = document.querySelectorAll('.auth-role-pill');
  pills.forEach(pill => {
    const radio = pill.querySelector('input[type="radio"]');
    radio.addEventListener('change', () => {
      // Remove selected class from all
      pills.forEach(p => p.classList.remove('selected'));
      // Add to the parent of the checked radio
      if (radio.checked) {
        pill.classList.add('selected');
      }
    });
  });
}

/* ── 4. Form Handling & LocalStorage Auth ────────────────────── */
function initForms() {
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const banner = document.getElementById('auth-banner');
  const bannerText = document.getElementById('auth-banner-text');

  const showMessage = (msg, isError = true) => {
    bannerText.textContent = msg;
    banner.className = `auth-form-banner visible ${isError ? 'error' : 'success'}`;
    // Margin adjustment for layout stability
    banner.style.marginBottom = 'var(--space-6)'; 
  };

  const clearMessage = () => {
    banner.classList.remove('visible');
    banner.style.marginBottom = '0';
  };

  // Helper to simulate network delay for better UX
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /* --- Login Logic --- */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = loginForm.querySelector('.auth-submit-btn');

    if (!email || !password) {
      return showMessage('Please fill in all fields.');
    }

    btn.classList.add('loading');
    btn.disabled = true;
    await sleep(600); // Simulate network latency

    const users = storageGet('users', {});
    const user = users[email];

    if (user && user.password === password) {
      // Success! Set session and redirect
      setCurrentUser(user);
      window.location.href = 'index.html';
    } else {
      // Fail
      showMessage('Invalid email or password.');
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  /* --- Register Logic --- */
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    const btn = registerForm.querySelector('.auth-submit-btn');

    if (!name || !email || !password) {
      return showMessage('Please complete all required fields.');
    }

    if (password.length < 6) {
      return showMessage('Password must be at least 6 characters.');
    }

    btn.classList.add('loading');
    btn.disabled = true;
    await sleep(800); // Simulate network latency

    const users = storageGet('users', {});

    // Check if email already exists
    if (users[email]) {
      showMessage('An account with this email already exists.');
      btn.classList.remove('loading');
      btn.disabled = false;
      return;
    }

    // Generate Initials (e.g., "Budi Santoso" -> "BS")
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Create New User Object
    const newUser = {
      id: `user_${Date.now().toString(36)}`, // Simple unique ID
      name,
      email,
      password, // Plain text strictly for this demo
      role,
      avatarInitials: initials,
      createdAt: new Date().toISOString(),
      orderCount: 0,
      totalSpent: 0
    };

    // Save to DB
    users[email] = newUser;
    storageSet('users', users);
    
    // Auto-update user ID registry (for admin iteration purposes)
    const userIds = storageGet('user_ids', []);
    userIds.push(newUser.id);
    storageSet('user_ids', userIds);

    // Set Session and redirect
    setCurrentUser(newUser);
    window.location.href = 'index.html';
  });
}