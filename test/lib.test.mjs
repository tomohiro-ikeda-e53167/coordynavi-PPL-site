import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeCompany, padIndex, buildLicenseName, buildLicenseNames, validateInputs } from "../lib.js";

test("sanitizeCompany removes whitespace and underscores, keeps other chars", () => {
  assert.equal(sanitizeCompany("  Acme Corp. "), "AcmeCorp.");
  assert.equal(sanitizeCompany("a_b c"), "abc");
  assert.equal(sanitizeCompany("株式会社 東京"), "株式会社東京");
  assert.equal(sanitizeCompany(""), "");
  assert.equal(sanitizeCompany(null), "");
});

test("padIndex zero-pads to 3 digits by default", () => {
  assert.equal(padIndex(1), "001");
  assert.equal(padIndex(11), "011");
  assert.equal(padIndex(123), "123");
});

test("buildLicenseName composes PPL_<CC>_<company>_<NNN>", () => {
  assert.equal(
    buildLicenseName({ country: "jpn", company: "Acme Corp", index: 1 }),
    "PPL_JPN_AcmeCorp_001"
  );
});

test("buildLicenseNames produces a sequential list", () => {
  assert.deepEqual(
    buildLicenseNames({ country: "JPN", company: "Acme", startIndex: 11, count: 2 }),
    ["PPL_JPN_Acme_011", "PPL_JPN_Acme_012"]
  );
  assert.deepEqual(
    buildLicenseNames({ country: "IND", company: "Foo", startIndex: 1, count: 3 }),
    ["PPL_IND_Foo_001", "PPL_IND_Foo_002", "PPL_IND_Foo_003"]
  );
});

test("validateInputs accepts a well-formed input", () => {
  const r = validateInputs({ token: "prod-x", company: "Acme", country: "JPN", count: 3, startIndex: 1 });
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, []);
});

test("validateInputs rejects missing token / company / country", () => {
  const r = validateInputs({ token: "", company: "  ", country: "", count: 1, startIndex: 1 });
  assert.equal(r.valid, false);
  assert.equal(r.errors.length, 3);
});

test("validateInputs enforces count range 1..maxCount", () => {
  assert.equal(validateInputs({ token: "t", company: "A", country: "JPN", count: 0, startIndex: 1 }).valid, false);
  assert.equal(validateInputs({ token: "t", company: "A", country: "JPN", count: 101, startIndex: 1 }).valid, false);
  assert.equal(validateInputs({ token: "t", company: "A", country: "JPN", count: 100, startIndex: 1 }).valid, true);
});

test("validateInputs enforces startIndex >= 1", () => {
  assert.equal(validateInputs({ token: "t", company: "A", country: "JPN", count: 1, startIndex: 0 }).valid, false);
  assert.equal(validateInputs({ token: "t", company: "A", country: "JPN", count: 1, startIndex: 1 }).valid, true);
});
