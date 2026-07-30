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

// --- Country dropdown ---
function populateCountries() {
  const frag = document.createDocumentFragment();
  const placeholder = document.createElement("option");
  placeholder.value = ""; placeholder.textContent = "— Select a country —";
  frag.appendChild(placeholder);
  for (const c of COUNTRIES) {
    const o = document.createElement("option");
    o.value = c.code; o.textContent = `${c.name} (${c.code})`;
    frag.appendChild(o);
  }
  els.country.appendChild(frag);
  // Default to Japan
  els.country.value = "JPN";
}

// --- Token session persistence ---
function initToken() {
  const saved = sessionStorage.getItem(TOKEN_KEY);
  if (saved) els.token.value = saved;
  els.token.addEventListener("input", () => {
    const v = els.token.value.trim();
    if (v) sessionStorage.setItem(TOKEN_KEY, v);
    else sessionStorage.removeItem(TOKEN_KEY);
  });
}

// --- Preview (no token needed, instant) ---
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
    ? `Sanitized company name: ${san || "(will be empty)"}`
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

// --- Render results ---
function addResultRow(r) {
  const tr = document.createElement("tr");
  const tdName = document.createElement("td");
  tdName.textContent = r.name;
  const tdKey = document.createElement("td");
  tdKey.className = "key";
  tdKey.textContent = r.status === "ok" ? r.key : "—";
  const tdStatus = document.createElement("td");
  if (r.status === "ok") { tdStatus.className = "ok"; tdStatus.textContent = "OK"; }
  else { tdStatus.className = "fail"; tdStatus.textContent = "Failed: " + (r.error || ""); }
  tr.append(tdName, tdKey, tdStatus);
  els.resultsBody.appendChild(tr);
}

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.classList.toggle("error", isError);
}

// --- Issue ---
async function onIssue() {
  const input = currentInputs();
  const { valid, errors } = validateInputs(input, { maxCount: MAX_COUNT });
  if (!valid) { setStatus(errors.join(" / "), true); return; }

  els.issueBtn.disabled = true;
  els.resultsBody.innerHTML = "";
  const names = buildLicenseNames(input, nameOpts);
  const apiBase = { apiUrl: KEYGEN_API, account: KEYGEN_ACCOUNT, token: input.token };

  try {
    setStatus("Resolving policy…");
    if (!cachedPolicyId) {
      cachedPolicyId = await resolvePolicyId({ ...apiBase, policyName: POLICY_NAME });
    }
    setStatus(`Issuing… (0/${names.length})`);
    let done = 0;
    const results = await issueBatch({
      ...apiBase, policyId: cachedPolicyId, names,
      onResult: (r) => { addResultRow(r); done++; setStatus(`Issuing… (${done}/${names.length})`); },
    });
    const ok = results.filter((r) => r.status === "ok").length;
    const fail = results.length - ok;
    setStatus(`Done: ${ok} succeeded / ${fail} failed`, fail > 0);
  } catch (e) {
    // Top-level failure: policy resolution, network/CORS, etc.
    cachedPolicyId = null;
    setStatus("Error: " + e.message + " (check the token, connection, and CORS)", true);
  } finally {
    els.issueBtn.disabled = false;
  }
}

// --- Init ---
populateCountries();
initToken();
renderPreview();
for (const el of [els.company, els.country, els.count, els.startIndex]) {
  el.addEventListener("input", renderPreview);
}
els.issueBtn.addEventListener("click", onIssue);
