'use strict';
// Функціональні тести інтерфейсу: сторінка завантажується в jsdom, дії виконуються як у користувача.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function openPage() {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const shop = fs.readFileSync(path.join(__dirname, '../src/shop.js'), 'utf8');
  const page = html.replace('<script src="src/shop.js"></script>', () => `<script>${shop}</script>`);
  const dom = new JSDOM(page, { runScripts: 'dangerously' });
  const doc = dom.window.document;
  const $ = (id) => doc.getElementById(id);
  const type = (id, value) => {
    $(id).value = value;
    $(id).dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const add = (id) => doc.querySelector(`[data-add="${id}"]`).click();
  const del = (id) => doc.querySelector(`[data-del="${id}"]`).click();
  const submit = () => $('order').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const cards = () => doc.querySelectorAll('#grid .card').length;
  return { doc, $, type, add, del, submit, cards };
}

describe('Інтерфейс сайту (функціональне тестування)', () => {
  test('UI-1 каталог показує всі 8 моделей', () => assert.equal(openPage().cards(), 8));

  test('UI-2 пошук звужує каталог, відсутній збіг показує підказку', () => {
    const p = openPage();
    p.type('q', 'дракон');
    assert.equal(p.cards(), 1);
    p.type('q', 'zzz');
    assert.equal(p.cards(), 0);
    assert.match(p.$('grid').textContent, /Нічого не знайдено/);
  });

  test('UI-3 додавання в кошик оновлює лічильник і блокує кнопку', () => {
    const p = openPage();
    p.add(1);
    assert.equal(p.$('count').textContent, '1');
    assert.equal(p.doc.querySelector('[data-add="1"]').disabled, true);
    assert.match(p.$('subtotal').textContent, /450,00/);
  });

  test('UI-4 повідомлення про знижку оновлюється після зміни кошика', () => {
    const p = openPage();
    p.add(1);
    p.$('promo').value = 'MODEL10';
    p.$('applyPromo').click();
    assert.match(p.$('promoMsg').textContent, /45,00/);
    p.del(1);
    p.add(3);
    assert.match(p.$('promoMsg').textContent, /120,00/);
    assert.match(p.$('total').textContent, /1 080,00/);
  });

  test('UI-5 промокод у порожньому кошику не обіцяє знижку 0,00 грн', () => {
    const p = openPage();
    p.$('promo').value = 'MODEL10';
    p.$('applyPromo').click();
    assert.doesNotMatch(p.$('promoMsg').textContent, /−0,00/);
  });

  test('UI-6 недійсний промокод показує помилку', () => {
    const p = openPage();
    p.add(1);
    p.$('promo').value = 'FREE';
    p.$('applyPromo').click();
    assert.match(p.$('promoMsg').textContent, /не знайдено/);
    assert.match(p.$('total').textContent, /450,00/);
  });

  test('UI-7 некоректна форма не оформлює замовлення', () => {
    const p = openPage();
    p.add(1);
    p.submit();
    assert.equal(p.$('count').textContent, '1');
    assert.match(p.$('status').textContent, /ім’я/);
  });

  test('UI-8 успішне замовлення очищає кошик і показує підтвердження', () => {
    const p = openPage();
    p.add(1);
    p.$('name').value = 'Олена';
    p.$('email').value = 'olena@example.com';
    p.$('agree').checked = true;
    p.submit();
    assert.equal(p.$('count').textContent, '0');
    assert.match(p.$('status').textContent, /Замовлення прийнято/);
  });
});
