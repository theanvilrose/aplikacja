// Testy wczytywania słownika (js/parser.js): slownik.md, zwroty.md, czesci_mowy.md. Uruchom: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMarkdown } = require('../js/parser.js');

const SLOWNIK = `## 📊 Zbiorcza Tabela
| Symbol | Część mowy / Kategoria | Liczba haseł |
| :--- | :--- | :--- |
| 🟦 | rz. | 1 |

## 👋 1. Przedstawianie się
| Słowo | Poziom | Przedrostek | Część mowy | Wymowa | Tłumaczenie | Uwagi | 🧠 Skojarzenie | Przykładowe zdanie |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **accent** | B1 | an | 🟦 rz. | ÆK-sent | akcent | — | — | He has an accent. |

## 🗣️ 29. Języki
| Słowo | Poziom | Przedrostek | Część mowy | Wymowa | Tłumaczenie | Uwagi | 🧠 Skojarzenie | Przykładowe zdanie |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **accent** | B1 | an | 🟦 rz. | ÆK-sent | akcent | — | — | — |
| **speak** | A1 | — | 🟩 cz. | SPIIK | mówić | nieregularny | — | I speak English. |`;
const ZWROTY = `## 👋 1. Powitania i Pożegnania (Greetings) – 1 zwrot
| Zwrot / Wyrażenie | Poziom | Typ zwrotu | Wymowa i akcent | Tłumaczenie | Uwagi | 🧠 Skojarzenie / Pułapka / Kontekst | Przykładowe zdanie |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **See you!** | A1 | 💬 | SII ju | na razie | — | — | See you! |`;
const CZESCI = `## 🟪 5. Zaimki (Pronouns) – 1 zaimek
| Słowo | Poziom | Przedrostek | Wymowa | Tłumaczenie | Dział w słowniku | Uwagi | Przykładowe zdanie |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **any** | A1 | — | E-ni | jakikolwiek | 🟪 13. Zaimki – Kompletny System | — | Any questions? |
| **speak** | A1 | — | SPIIK | mówić | 1. Przedstawianie się, 29. Języki | — | — |`;

test('nowy słownik: działy, poziom, przedimek, uwagi, zwroty i zaimki', () => {
  const ws = parseMarkdown([SLOWNIK, ZWROTY, CZESCI]);
  const by = Object.fromEntries(ws.map((w) => [w.id, w]));
  assert.deepEqual(ws.map((w) => w.id), ['accent', 'speak', 'see you!', 'any']);
  assert.equal(by.accent.topic, 'Przedstawianie się');
  assert.deepEqual(by.accent.topics, ['Przedstawianie się', 'Języki']);
  assert.equal(by.accent.icon, '👋');
  assert.equal(by.accent.level, 'B1');
  assert.equal(by.accent.article, 'an');
  assert.equal(by.accent.notes, undefined); // „—” = brak
  assert.equal(by.speak.pos, 'cz.');
  assert.equal(by.speak.notes, 'nieregularny');
  assert.deepEqual(by.speak.topics, ['Języki', 'Przedstawianie się']);
  assert.equal(by['see you!'].pos, 'zwrot');
  assert.equal(by['see you!'].topic, 'Powitania i Pożegnania');
  assert.equal(by.any.pos, 'zaim.');
  assert.equal(by.any.topic, 'Zaimki');
});
