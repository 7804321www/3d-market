'use strict';

// Модуль обгорнуто в IIFE, щоб його const-змінні не потрапляли в глобальну область сторінки.
(function () {

const PRODUCTS = [
  { id: 1, title: 'Робот-помічник', category: 'Персонажі', format: 'FBX', price: 450, rating: 4.8, emoji: '🤖', tags: ['робот', 'sci-fi'] },
  { id: 2, title: 'Дракон низькополігональний', category: 'Персонажі', format: 'OBJ', price: 380, rating: 4.6, emoji: '🐉', tags: ['дракон', 'fantasy', 'low poly'] },
  { id: 3, title: 'Спорткар 2020', category: 'Транспорт', format: 'BLEND', price: 1200, rating: 4.9, emoji: '🏎️', tags: ['авто', 'машина'] },
  { id: 4, title: 'Космічний шатл', category: 'Транспорт', format: 'FBX', price: 950, rating: 4.5, emoji: '🚀', tags: ['космос', 'sci-fi'] },
  { id: 5, title: 'Українська хата', category: 'Архітектура', format: 'OBJ', price: 600, rating: 4.7, emoji: '🏠', tags: ['будинок', 'село'] },
  { id: 6, title: 'Готичний собор', category: 'Архітектура', format: 'STL', price: 1500, rating: 4.4, emoji: '⛪', tags: ['собор', 'готика'] },
  { id: 7, title: 'Крісло лофт', category: 'Меблі', format: 'BLEND', price: 220, rating: 4.2, emoji: '🪑', tags: ['крісло', 'інтер’єр'] },
  { id: 8, title: 'Настільна лампа', category: 'Меблі', format: 'STL', price: 150, rating: 4.0, emoji: '💡', tags: ['лампа', 'інтер’єр'] },
];

const PROMOS = { MODEL10: 10, STUDENT15: 15 };

const norm = (s) => String(s ?? '').trim().toLowerCase();
const toNum = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

/** Пошук за назвою або тегом (без урахування регістру та пробілів по краях). */
function searchProducts(list, query) {
  const q = norm(query);
  if (!q) return list.slice();
  return list.filter((p) => norm(p.title).includes(q) || p.tags.some((t) => norm(t).includes(q)));
}

/** Фільтр за категорією, форматом і діапазоном цін (межі включно). */
function filterProducts(list, { category = '', format = '', minPrice, maxPrice } = {}) {
  let lo = toNum(minPrice);
  let hi = toNum(maxPrice);
  if (lo !== null && hi !== null && lo > hi) [lo, hi] = [hi, lo];
  return list.filter(
    (p) =>
      (!category || p.category === category) &&
      (!format || p.format === format) &&
      (lo === null || p.price >= lo) &&
      (hi === null || p.price <= hi)
  );
}

/** Сортування: price-asc, price-desc, rating, name. Невідомий ключ – порядок без змін. */
function sortProducts(list, key) {
  const copy = list.slice();
  switch (key) {
    case 'price-asc': return copy.sort((a, b) => a.price - b.price);
    case 'price-desc': return copy.sort((a, b) => b.price - a.price);
    case 'rating': return copy.sort((a, b) => b.rating - a.rating);
    case 'name': return copy.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    default: return copy;
  }
}

/** Цифрова ліцензія купується один раз, тому дублікати в кошик не додаються. */
function addToCart(cart, product) {
  if (!product || cart.some((i) => i.id === product.id)) return cart.slice();
  return [...cart, { id: product.id, title: product.title, price: product.price }];
}

function removeFromCart(cart, id) {
  return cart.filter((i) => i.id !== id);
}

function cartSubtotal(cart) {
  return cart.reduce((sum, i) => sum + i.price, 0);
}

/** Промокод: регістр і пробіли по краях не мають значення; знижка округлюється до копійок. */
function applyPromo(subtotal, code) {
  const key = String(code ?? '').trim().toUpperCase();
  if (!Object.hasOwn(PROMOS, key)) return { valid: false, discount: 0, total: subtotal };
  const discount = Math.round(subtotal * PROMOS[key]) / 100;
  return { valid: true, discount, total: Math.round((subtotal - discount) * 100) / 100 };
}

function validateOrder({ name, email, agree } = {}) {
  const errors = {};
  if (String(name ?? '').trim().length < 2) errors.name = 'Вкажіть ім’я (мінімум 2 символи)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email ?? '').trim())) errors.email = 'Некоректна адреса пошти';
  if (agree !== true) errors.agree = 'Потрібна згода з умовами ліцензії';
  return { valid: Object.keys(errors).length === 0, errors };
}

function createOrder(cart, promoCode, customer) {
  if (cart.length === 0) return { ok: false, errors: { cart: 'Кошик порожній' } };
  const check = validateOrder(customer);
  if (!check.valid) return { ok: false, errors: check.errors };
  const subtotal = cartSubtotal(cart);
  const promo = applyPromo(subtotal, promoCode);
  return { ok: true, items: cart.length, subtotal, discount: promo.discount, total: promo.total };
}

function formatPrice(n) {
  const [int, frac] = Number(n).toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${frac} грн`;
}

const api = {
  PRODUCTS, searchProducts, filterProducts, sortProducts, addToCart, removeFromCart,
  cartSubtotal, applyPromo, validateOrder, createOrder, formatPrice,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else window.Shop = api;
})();
