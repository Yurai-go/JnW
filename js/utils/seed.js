/**
 * seed.js — Welfmart Initial Data Seeder
 * ========================================
 * Checks if the database (localStorage) has already been seeded.
 * If not, populates it with default products and demo user accounts.
 *
 * Call runSeeder() once at the top of every page's module script
 * (before any reads). It exits immediately on subsequent page loads.
 *
 * ⚠️  SECURITY NOTE: Passwords are stored in plain text here because
 * this project uses localStorage as a mock database. In a production
 * environment, ALWAYS hash passwords server-side (e.g., bcrypt).
 *
 * Location: js/utils/seed.js
 */

import { storageGet, storageSet } from './storage.js';

/* ── Seed Version ────────────────────────────────────────────
   Increment SEED_VERSION to force a re-seed after schema changes.
   The old data is wiped and replaced cleanly.
─────────────────────────────────────────────────────────────── */
const SEED_VERSION = 1;

/* ═══════════════════════════════════════════════════════════
   SEED DATA
═══════════════════════════════════════════════════════════ */

/**
 * Default product catalog.
 * Schema: { id, name, category, price (IDR), emoji, description, stock, available }
 * Categories: 'Food' | 'Drink' | 'Snack'
 */
const SEED_PRODUCTS = [
  /* ─── Food ────────────────────────────────────────────── */
  {
    id:          'prod_001',
    name:        'Nasi Kotak Spesial',
    category:    'Food',
    price:       15000,
    emoji:       '🍱',
    description: 'Nasi putih pulen dengan lauk ayam kecap, tempe orek, dan sayur bening. Porsi kenyang untuk siang hari.',
    stock:       20,
    available:   true,
    createdAt:   new Date().toISOString(),
  },
  {
    id:          'prod_002',
    name:        'Mie Goreng Spesial',
    category:    'Food',
    price:       12000,
    emoji:       '🍜',
    description: 'Mie goreng gurih dengan telur, sayuran segar, dan taburan bawang goreng. Pedas sesuai selera.',
    stock:       15,
    available:   true,
    createdAt:   new Date().toISOString(),
  },
  {
    id:          'prod_003',
    name:        'Nasi Uduk + Ayam',
    category:    'Food',
    price:       13000,
    emoji:       '🍚',
    description: 'Nasi uduk harum dimasak santan, disajikan dengan ayam goreng renyah dan sambal kacang.',
    stock:       12,
    available:   true,
    createdAt:   new Date().toISOString(),
  },

  /* ─── Drink ────────────────────────────────────────────── */
  {
    id:          'prod_004',
    name:        'Jus Jeruk Segar',
    category:    'Drink',
    price:       8000,
    emoji:       '🍊',
    description: 'Jus jeruk peras segar tanpa pengawet, manis alami dan kaya vitamin C. Dingin dan menyegarkan.',
    stock:       30,
    available:   true,
    createdAt:   new Date().toISOString(),
  },
  {
    id:          'prod_005',
    name:        'Es Teh Manis',
    category:    'Drink',
    price:       5000,
    emoji:       '🧋',
    description: 'Teh manis dingin klasik yang selalu pas menemani makan siang. Dibuat segar setiap hari.',
    stock:       50,
    available:   true,
    createdAt:   new Date().toISOString(),
  },

  /* ─── Snack ────────────────────────────────────────────── */
  {
    id:          'prod_006',
    name:        'Donat Cokelat',
    category:    'Snack',
    price:       5000,
    emoji:       '🍩',
    description: 'Donat empuk dengan topping cokelat leleh dan taburan rainbow sprinkles. Cocok untuk camilan sore.',
    stock:       25,
    available:   true,
    createdAt:   new Date().toISOString(),
  },
  {
    id:          'prod_007',
    name:        'Risoles Ragout',
    category:    'Snack',
    price:       6000,
    emoji:       '🥐',
    description: 'Risoles goreng renyah berisi ragout ayam dan sayuran. Dibalut tepung panir golden dan crispy.',
    stock:       18,
    available:   true,
    createdAt:   new Date().toISOString(),
  },
];

/**
 * Default user accounts for testing all role-based features.
 *
 * Roles:
 *   'admin'   → Full access to Admin CMS Dashboard
 *   'teacher' → 20% automatic discount on all purchases
 *   'ustadz'  → 20% automatic discount (aliased role)
 *   'student' → Standard pricing, no discount
 *
 * ⚠️  Passwords here are plain text for demo/localhost only.
 */
const SEED_USERS = [
  /* ─── Admin Account ─────────────────────────────────────── */
  {
    id:         'user_admin_001',
    name:       'Ahmad Fauzi',
    email:      'admin@welfmart.sch.id',
    password:   'admin123',          // ⚠️ plain text — demo only
    role:       'admin',
    avatarInitials: 'AF',
    createdAt:  new Date().toISOString(),
    orderCount: 0,
    totalSpent: 0,
  },

  /* ─── Teacher Accounts (eligible for 20% discount) ─────── */
  {
    id:         'user_teacher_001',
    name:       'Ibu Sari Rahayu',
    email:      'sari.rahayu@welfmart.sch.id',
    password:   'teacher123',        // ⚠️ plain text — demo only
    role:       'teacher',
    avatarInitials: 'SR',
    createdAt:  new Date().toISOString(),
    orderCount: 0,
    totalSpent: 0,
  },
  {
    id:         'user_teacher_002',
    name:       'Ustadz Hamid Maulana',
    email:      'hamid.maulana@welfmart.sch.id',
    password:   'ustadz123',         // ⚠️ plain text — demo only
    role:       'ustadz',
    avatarInitials: 'HM',
    createdAt:  new Date().toISOString(),
    orderCount: 0,
    totalSpent: 0,
  },

  /* ─── Student Account (standard pricing) ───────────────── */
  {
    id:         'user_student_001',
    name:       'Budi Santoso',
    email:      'budi.santoso@welfmart.sch.id',
    password:   'student123',        // ⚠️ plain text — demo only
    role:       'student',
    avatarInitials: 'BS',
    createdAt:  new Date().toISOString(),
    orderCount: 0,
    totalSpent: 0,
  },
];

/* ═══════════════════════════════════════════════════════════
   SEEDER LOGIC
═══════════════════════════════════════════════════════════ */

/**
 * Main entry point. Safe to call on every page load.
 * Idempotent: exits immediately if already seeded at this version.
 *
 * @returns {{ seeded: boolean, reason: string }}
 */
export function runSeeder() {
  const existingVersion = storageGet('seed_version', 0);

  /* Already seeded at current version — do nothing */
  if (existingVersion >= SEED_VERSION) {
    return { seeded: false, reason: `Already at seed version ${SEED_VERSION}.` };
  }

  console.info(`[Seeder] Running seed v${SEED_VERSION}…`);

  /* Write products */
  storageSet('products', SEED_PRODUCTS);

  /* Write users — stored as a map for O(1) lookup by email */
  const userMap = {};
  SEED_USERS.forEach(user => { userMap[user.email] = user; });
  storageSet('users', userMap);

  /* Write ordered list of user IDs (for admin panel iteration) */
  storageSet('user_ids', SEED_USERS.map(u => u.id));

  /* Write empty orders registry */
  storageSet('orders', []);

  /* Mark seeded */
  storageSet('seed_version', SEED_VERSION);

  console.info(`[Seeder] ✓ Seeded ${SEED_PRODUCTS.length} products and ${SEED_USERS.length} users.`);
  console.table(SEED_USERS.map(({ name, email, role, password }) => ({ name, email, role, password })));

  return { seeded: true, reason: `Seeded successfully at version ${SEED_VERSION}.` };
}

/* ── Developer Helpers (exposed for browser console access) ── */

/**
 * Hard-resets the entire localStorage seed.
 * Call from the browser console: window.WM?.resetSeed()
 */
export function resetSeed() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('wm_'));
  keys.forEach(k => localStorage.removeItem(k));
  console.warn('[Seeder] 🔄 All Welfmart data cleared. Reload the page to re-seed.');
}

/**
 * Logs current storage contents to the browser console.
 * Call from the browser console: window.WM?.debugStorage()
 */
export function debugStorage() {
  const data = {};
  Object.keys(localStorage)
    .filter(k => k.startsWith('wm_'))
    .forEach(k => {
      try { data[k.replace('wm_', '')] = JSON.parse(localStorage.getItem(k)); }
      catch { data[k] = localStorage.getItem(k); }
    });
  console.group('[Seeder] Current Welfmart Storage');
  console.table(data);
  console.groupEnd();
  return data;
}