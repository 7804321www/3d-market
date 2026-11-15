'use strict';
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/shop.js');

const P = S.PRODUCTS;
const ids = (list) => list.map((p) => p.id);
const prod = (id) => P.find((p) => p.id === id);

describe('Пошук (searchProducts) – еквівалентні класи', () => {
  test('TC-S1 порожній запит повертає весь каталог', () => assert.equal(S.searchProducts(P, '').length, P.length));
  test('TC-S2 пошук не залежить від регістру', () => assert.deepEqual(ids(S.searchProducts(P, 'ДРАКОН')), [2]));
  test('TC-S3 пробіли по краях ігноруються', () => assert.deepEqual(ids(S.searchProducts(P, '  робот  ')), [1]));
  test('TC-S4 пошук за тегом', () => assert.deepEqual(ids(S.searchProducts(P, 'sci-fi')), [1, 4]));
  test('TC-S5 відсутній збіг дає порожній список', () => assert.deepEqual(S.searchProducts(P, 'zzz'), []));
  test('TC-S6 спецсимволи не ламають пошук', () => assert.deepEqual(S.searchProducts(P, '(.*['), []));
  test('TC-S7 null та undefined трактуються як порожній запит', () => {
    assert.equal(S.searchProducts(P, null).length, P.length);
    assert.equal(S.searchProducts(P, undefined).length, P.length);
  });
  test('TC-S8 вихідний масив не змінюється', () => {
    const copy = P.slice();
    S.searchProducts(P, 'авто');
    assert.deepEqual(P, copy);
  });
});

describe('Фільтри (filterProducts) – граничні значення', () => {
  test('TC-F1 без параметрів повертає все', () => assert.equal(S.filterProducts(P).length, P.length));
  test('TC-F2 фільтр за категорією', () => assert.deepEqual(ids(S.filterProducts(P, { category: 'Меблі' })), [7, 8]));
  test('TC-F3 фільтр за форматом', () => assert.deepEqual(ids(S.filterProducts(P, { format: 'STL' })), [6, 8]));
  test('TC-F4 межі діапазону цін включно (220…450)', () =>
    assert.deepEqual(ids(S.filterProducts(P, { minPrice: 220, maxPrice: 450 })), [1, 2, 7]));
  test('TC-F5 перевернутий діапазон (min > max) обробляється', () =>
    assert.deepEqual(ids(S.filterProducts(P, { minPrice: 450, maxPrice: 220 })), [1, 2, 7]));
  test('TC-F6 порожні рядки з полів форми ігноруються', () =>
    assert.equal(S.filterProducts(P, { minPrice: '', maxPrice: '' }).length, P.length));
  test('TC-F7 комбінація категорії та формату', () =>
    assert.deepEqual(ids(S.filterProducts(P, { category: 'Транспорт', format: 'FBX' })), [4]));
  test('TC-F8 ціни рядками з форми працюють як числа', () =>
    assert.deepEqual(ids(S.filterProducts(P, { minPrice: '1200' })), [3, 6]));
  test('TC-F9 діапазон без товарів дає порожній список', () =>
    assert.deepEqual(S.filterProducts(P, { minPrice: 10000 }), []));
});

describe('Сортування (sortProducts)', () => {
  test('TC-O1 ціна за зростанням', () => assert.deepEqual(ids(S.sortProducts(P, 'price-asc')), [8, 7, 2, 1, 5, 4, 3, 6]));
  test('TC-O2 ціна за спаданням', () => assert.deepEqual(ids(S.sortProducts(P, 'price-desc')), [6, 3, 4, 5, 1, 2, 7, 8]));
  test('TC-O3 за рейтингом від найвищого', () => assert.equal(S.sortProducts(P, 'rating')[0].id, 3));
  test('TC-O4 за назвою в українському алфавіті', () => {
    const titles = S.sortProducts(P, 'name').map((p) => p.title);
    assert.deepEqual(titles, titles.slice().sort((a, b) => a.localeCompare(b, 'uk')));
  });
  test('TC-O5 невідомий ключ залишає порядок', () => assert.deepEqual(ids(S.sortProducts(P, 'xyz')), ids(P)));
  test('TC-O6 вихідний масив не мутується', () => {
    const before = ids(P);
    S.sortProducts(P, 'price-desc');
    assert.deepEqual(ids(P), before);
  });
});

describe('Кошик', () => {
  test('TC-C1 додавання товару', () => assert.deepEqual(ids(S.addToCart([], prod(1))), [1]));
  test('TC-C2 дублікат не додається', () => assert.equal(S.addToCart(S.addToCart([], prod(1)), prod(1)).length, 1));
  test('TC-C3 видалення товару', () => assert.deepEqual(S.removeFromCart(S.addToCart([], prod(1)), 1), []));
  test('TC-C4 видалення відсутнього id не змінює кошик', () => assert.equal(S.removeFromCart(S.addToCart([], prod(1)), 99).length, 1));
  test('TC-C5 сума кошика', () => {
    let cart = S.addToCart([], prod(1));
    cart = S.addToCart(cart, prod(3));
    assert.equal(S.cartSubtotal(cart), 1650);
  });
  test('TC-C6 сума порожнього кошика дорівнює 0', () => assert.equal(S.cartSubtotal([]), 0));
  test('TC-C7 undefined як товар ігнорується', () => assert.deepEqual(S.addToCart([], undefined), []));
});

describe('Промокоди (applyPromo)', () => {
  test('TC-P1 MODEL10: −10%', () => assert.deepEqual(S.applyPromo(1000, 'MODEL10'), { valid: true, discount: 100, total: 900 }));
  test('TC-P2 код нечутливий до регістру й пробілів', () => assert.equal(S.applyPromo(1000, '  model10 ').valid, true));
  test('TC-P3 STUDENT15: −15%', () => assert.equal(S.applyPromo(1000, 'STUDENT15').total, 850));
  test('TC-P4 неіснуючий код не дає знижки', () => assert.deepEqual(S.applyPromo(1000, 'FREE'), { valid: false, discount: 0, total: 1000 }));
  test('TC-P5 порожній код', () => assert.equal(S.applyPromo(1000, '').valid, false));
  test('TC-P6 службові назви об’єкта не є промокодами', () => {
    assert.equal(S.applyPromo(1000, 'constructor').valid, false);
    assert.equal(S.applyPromo(1000, '__proto__').valid, false);
  });
  test('TC-P7 округлення до копійок', () => assert.deepEqual(S.applyPromo(150, 'STUDENT15'), { valid: true, discount: 22.5, total: 127.5 }));
  test('TC-P8 знижка на нульову суму', () => assert.equal(S.applyPromo(0, 'MODEL10').total, 0));
});

describe('Валідація замовлення (validateOrder)', () => {
  const ok = { name: 'Іван', email: 'ivan@example.com', agree: true };
  test('TC-V1 коректні дані', () => assert.equal(S.validateOrder(ok).valid, true));
  test('TC-V2 порожнє ім’я', () => assert.ok(S.validateOrder({ ...ok, name: '' }).errors.name));
  test('TC-V3 ім’я з одного символу (межа)', () => assert.ok(S.validateOrder({ ...ok, name: 'І' }).errors.name));
  test('TC-V4 ім’я з двох символів (межа)', () => assert.equal(S.validateOrder({ ...ok, name: 'Ян' }).valid, true));
  test('TC-V5 ім’я з самих пробілів', () => assert.ok(S.validateOrder({ ...ok, name: '   ' }).errors.name));
  for (const bad of ['abc', 'a@b', '@x.com', 'a b@c.com', 'a@b.c', '']) {
    test(`TC-V6 некоректна пошта «${bad}»`, () => assert.ok(S.validateOrder({ ...ok, email: bad }).errors.email));
  }
  test('TC-V7 пошта з піддоменом', () => assert.equal(S.validateOrder({ ...ok, email: 'a@mail.kyiv.ua' }).valid, true));
  test('TC-V8 без згоди з умовами', () => assert.ok(S.validateOrder({ ...ok, agree: false }).errors.agree));
  test('TC-V9 виклик без аргументів повертає всі помилки', () => assert.equal(Object.keys(S.validateOrder().errors).length, 3));
});

describe('Форматування ціни', () => {
  test('TC-M1 тисячі розділяються пробілом', () => assert.equal(S.formatPrice(1500), '1 500,00 грн'));
  test('TC-M2 нуль', () => assert.equal(S.formatPrice(0), '0,00 грн'));
  test('TC-M3 копійки', () => assert.equal(S.formatPrice(127.5), '127,50 грн'));
  test('TC-M4 мільйони', () => assert.equal(S.formatPrice(1234567.5), '1 234 567,50 грн'));
});

describe('Інтеграційні сценарії (createOrder)', () => {
  const customer = { name: 'Олена', email: 'olena@example.com', agree: true };
  test('TC-I1 повний сценарій: каталог → кошик → промокод → замовлення', () => {
    const found = S.sortProducts(S.filterProducts(S.searchProducts(P, ''), { category: 'Транспорт' }), 'price-desc');
    let cart = [];
    for (const p of found) cart = S.addToCart(cart, p);
    const order = S.createOrder(cart, 'MODEL10', customer);
    assert.deepEqual(order, { ok: true, items: 2, subtotal: 2150, discount: 215, total: 1935 });
  });
  test('TC-I2 порожній кошик не оформлюється', () => assert.ok(S.createOrder([], '', customer).errors.cart));
  test('TC-I3 некоректні дані клієнта блокують замовлення', () => {
    const r = S.createOrder(S.addToCart([], prod(1)), '', { name: '', email: 'x', agree: false });
    assert.equal(r.ok, false);
    assert.equal(Object.keys(r.errors).length, 3);
  });
  test('TC-I4 недійсний промокод не блокує замовлення', () => {
    const r = S.createOrder(S.addToCart([], prod(8)), 'BAD', customer);
    assert.equal(r.ok, true);
    assert.equal(r.total, 150);
  });
  test('TC-I5 видалення товару змінює підсумок', () => {
    let cart = S.addToCart(S.addToCart([], prod(1)), prod(8));
    cart = S.removeFromCart(cart, 1);
    assert.equal(S.createOrder(cart, '', customer).total, 150);
  });
});
