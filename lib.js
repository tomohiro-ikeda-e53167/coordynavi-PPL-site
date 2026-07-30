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

export function validateInputs({ token, company, country, count, startIndex }, { maxCount = 100 } = {}) {
  const errors = [];
  if (!token || !String(token).trim()) errors.push("トークンを入力してください");
  if (!company || !sanitizeCompany(company)) errors.push("会社名を入力してください");
  if (!country || !/^[A-Za-z]{3}$/.test(String(country))) errors.push("国を選択してください");
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > maxCount) errors.push(`必要本数は 1〜${maxCount} で指定してください`);
  const s = Number(startIndex);
  if (!Number.isInteger(s) || s < 1) errors.push("開始インデックスは 1 以上で指定してください");
  return { valid: errors.length === 0, errors };
}
