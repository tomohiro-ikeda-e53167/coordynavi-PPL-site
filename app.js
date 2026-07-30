import { KEYGEN_ACCOUNT, KEYGEN_API, POLICY_NAME, PREFIX, SEP, PAD, MAX_COUNT } from "./config.js";
import { buildLicenseNames, validateInputs, sanitizeCompany } from "./lib.js";
import { COUNTRIES } from "./countries.js";
import { resolvePolicyId, issueBatch } from "./keygen.js";

const $ = (id) => document.getElementById(id);
const els = {
  token: $("token"), company: $("company"), country: $("country"),
  count: $("count"), startIndex: $("startIndex"),
  previewList: $("previewList"), sanitizedNote: $("sanitizedNote"),
  issueBtn: $("issueBtn"), status: $("status"), resultsBody: $("resultsBody"),
};

const TOKEN_KEY = "keygen_token";
const nameOpts = { prefix: PREFIX, sep: SEP, pad: PAD };
let cachedPolicyId = null;

// --- 国ドロップダウン ---
function populateCountries() {
  const frag = document.createDocumentFragment();
  const placeholder = document.createElement("option");
  placeholder.value = ""; placeholder.textContent = "— 国を選択 —";
  frag.appendChild(placeholder);
  for (const c of COUNTRIES) {
    const o = document.createElement("option");
    o.value = c.code; o.textContent = `${c.name} (${c.code})`;
    frag.appendChild(o);
  }
  els.country.appendChild(frag);
  // 既定で Japan を選択
  els.country.value = "JPN";
}

// --- トークンのセッション保持 ---
function initToken() {
  const saved = sessionStorage.getItem(TOKEN_KEY);
  if (saved) els.token.value = saved;
  els.token.addEventListener("input", () => {
    const v = els.token.value.trim();
    if (v) sessionStorage.setItem(TOKEN_KEY, v);
    else sessionStorage.removeItem(TOKEN_KEY);
  });
}

// --- プレビュー（トークン不要・即時） ---
function currentInputs() {
  return {
    token: els.token.value.trim(),
    company: els.company.value,
    country: els.country.value,
    count: els.count.value,
    startIndex: els.startIndex.value,
  };
}

function renderPreview() {
  const { company, country, count, startIndex } = currentInputs();
  const san = sanitizeCompany(company);
  els.sanitizedNote.textContent = company
    ? `整形後の会社名: ${san || "(空になります)"}`
    : "";
  els.previewList.innerHTML = "";
  const n = Number(count);
  if (!country || !san || !Number.isInteger(n) || n < 1 || n > MAX_COUNT || !Number.isInteger(Number(startIndex)) || Number(startIndex) < 1) {
    return;
  }
  const names = buildLicenseNames({ country, company, startIndex, count }, nameOpts);
  for (const name of names) {
    const li = document.createElement("li");
    li.textContent = name;
    els.previewList.appendChild(li);
  }
}

// --- 結果描画 ---
function addResultRow(r) {
  const tr = document.createElement("tr");
  const tdName = document.createElement("td");
  tdName.textContent = r.name;
  const tdKey = document.createElement("td");
  tdKey.className = "key";
  tdKey.textContent = r.status === "ok" ? r.key : "—";
  const tdStatus = document.createElement("td");
  if (r.status === "ok") { tdStatus.className = "ok"; tdStatus.textContent = "OK"; }
  else { tdStatus.className = "fail"; tdStatus.textContent = "失敗: " + (r.error || ""); }
  tr.append(tdName, tdKey, tdStatus);
  els.resultsBody.appendChild(tr);
}

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.classList.toggle("error", isError);
}

// --- 発行 ---
async function onIssue() {
  const input = currentInputs();
  const { valid, errors } = validateInputs(input, { maxCount: MAX_COUNT });
  if (!valid) { setStatus(errors.join(" / "), true); return; }

  els.issueBtn.disabled = true;
  els.resultsBody.innerHTML = "";
  const names = buildLicenseNames(input, nameOpts);
  const apiBase = { apiUrl: KEYGEN_API, account: KEYGEN_ACCOUNT, token: input.token };

  try {
    setStatus("ポリシーを確認中…");
    if (!cachedPolicyId) {
      cachedPolicyId = await resolvePolicyId({ ...apiBase, policyName: POLICY_NAME });
    }
    setStatus(`発行中… (0/${names.length})`);
    let done = 0;
    const results = await issueBatch({
      ...apiBase, policyId: cachedPolicyId, names,
      onResult: (r) => { addResultRow(r); done++; setStatus(`発行中… (${done}/${names.length})`); },
    });
    const ok = results.filter((r) => r.status === "ok").length;
    const fail = results.length - ok;
    setStatus(`完了: 成功 ${ok} / 失敗 ${fail}`, fail > 0);
  } catch (e) {
    // ポリシー解決失敗・ネットワーク/CORS など全体エラー
    cachedPolicyId = null;
    setStatus("エラー: " + e.message + "（トークン・接続・CORS を確認してください）", true);
  } finally {
    els.issueBtn.disabled = false;
  }
}

// --- 初期化 ---
populateCountries();
initToken();
renderPreview();
for (const el of [els.company, els.country, els.count, els.startIndex]) {
  el.addEventListener("input", renderPreview);
}
els.issueBtn.addEventListener("click", onIssue);
