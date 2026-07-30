// Pure functions only (no DOM/network). Used by both the browser and Node tests.

export function sanitizeCompany(input) {
  return String(input ?? "").trim().replace(/\s+/g, "").replace(/_/g, "");
}

export function padIndex(n, pad = 3) {
  return String(n).padStart(pad, "0");
}

export function buildLicenseName(
  { country, company, index },
  { prefix = "PPL", sep = "_", pad = 3 } = {}
) {
  const cc = String(country ?? "").toUpperCase();
  const co = sanitizeCompany(company);
  return `${prefix}${sep}${cc}${sep}${co}${sep}${padIndex(index, pad)}`;
}

export function buildLicenseNames({ country, company, startIndex, count }, opts = {}) {
  const start = Number(startIndex);
  const n = Number(count);
  const names = [];
  for (let i = 0; i < n; i++) {
    names.push(buildLicenseName({ country, company, index: start + i }, opts));
  }
  return names;
}

export function validateInputs({ token, company, country, count, startIndex }, { maxCount = 100 } = {}) {
  const errors = [];
  if (!token || !String(token).trim()) errors.push("Please enter a token");
  if (!company || !sanitizeCompany(company)) errors.push("Please enter a company name");
  if (!country || !/^[A-Za-z]{3}$/.test(String(country))) errors.push("Please select a country");
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > maxCount) errors.push(`Quantity must be between 1 and ${maxCount}`);
  const s = Number(startIndex);
  if (!Number.isInteger(s) || s < 1) errors.push("Start index must be 1 or greater");
  return { valid: errors.length === 0, errors };
}
