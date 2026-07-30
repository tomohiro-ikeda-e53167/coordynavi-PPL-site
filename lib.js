// 純粋関数のみ（DOM・ネットワークに依存しない）。ブラウザと Node テストの両方から使う。

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
