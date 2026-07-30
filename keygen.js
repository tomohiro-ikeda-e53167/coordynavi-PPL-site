// Keygen REST API クライアント（JSON:API）。fetchImpl を差し替え可能にしてテスト容易にする。
const MEDIA = "application/vnd.api+json";

async function api(method, path, { apiUrl, account, token, body, fetchImpl }) {
  const f = fetchImpl ?? globalThis.fetch;
  const res = await f(`${apiUrl}/v1/accounts/${account}${path}`, {
    method,
    headers: {
      Accept: MEDIA,
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": MEDIA } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = (json.errors ?? [])
      .map((e) => `${e.title ?? ""}: ${e.detail ?? ""}`.trim().replace(/^:\s*/, ""))
      .join("; ");
    throw new Error(`HTTP ${res.status}${detail ? " " + detail : ""}`);
  }
  return json;
}

export async function resolvePolicyId({ apiUrl, account, token, policyName, fetchImpl }) {
  const found = [];
  for (let page = 1; page <= 50; page++) {
    const json = await api("GET", `/policies?page[size]=100&page[number]=${page}`, { apiUrl, account, token, fetchImpl });
    const rows = json.data ?? [];
    for (const p of rows) {
      if (String(p.attributes?.name ?? "").toLowerCase() === policyName.toLowerCase()) found.push(p);
    }
    if (rows.length < 100) break;
  }
  if (found.length === 0) throw new Error(`ポリシーが見つかりません: "${policyName}"`);
  if (found.length > 1) throw new Error(`ポリシー名が重複しています: "${policyName}"（管理者に確認してください）`);
  return found[0].id;
}

export async function createLicense({ apiUrl, account, token, policyId, name, fetchImpl }) {
  const json = await api("POST", "/licenses", {
    apiUrl, account, token, fetchImpl,
    body: {
      data: {
        type: "licenses",
        attributes: { name },
        relationships: { policy: { data: { type: "policies", id: policyId } } },
      },
    },
  });
  return { id: json.data.id, key: json.data.attributes.key };
}

export async function issueBatch({ apiUrl, account, token, policyId, names, fetchImpl, onResult }) {
  const results = [];
  for (const name of names) {
    let r;
    try {
      const { id, key } = await createLicense({ apiUrl, account, token, policyId, name, fetchImpl });
      r = { name, id, key, status: "ok" };
    } catch (e) {
      r = { name, status: "fail", error: e.message };
    }
    results.push(r);
    if (onResult) onResult(r);
  }
  return results;
}
