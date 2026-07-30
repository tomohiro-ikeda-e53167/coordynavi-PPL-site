import { test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRIES } from "../countries.js";

test("COUNTRIES has ~249 ISO 3166-1 entries", () => {
  assert.ok(COUNTRIES.length >= 240, `expected >=240, got ${COUNTRIES.length}`);
});

test("every code is 3 uppercase letters", () => {
  for (const c of COUNTRIES) assert.match(c.code, /^[A-Z]{3}$/, `bad code: ${c.code}`);
});

test("every entry has a non-empty name", () => {
  for (const c of COUNTRIES) assert.ok(c.name && c.name.length > 0);
});

test("codes are unique", () => {
  const set = new Set(COUNTRIES.map((c) => c.code));
  assert.equal(set.size, COUNTRIES.length);
});

test("spot-checks: JPN/USA/IND present", () => {
  const byCode = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));
  assert.equal(byCode.JPN, "Japan");
  assert.equal(byCode.USA, "United States of America");
  assert.equal(byCode.IND, "India");
});

test("sorted by name ascending", () => {
  const names = COUNTRIES.map((c) => c.name);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, sorted);
});
