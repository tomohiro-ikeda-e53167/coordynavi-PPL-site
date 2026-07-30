import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePolicyId, createLicense, issueBatch } from "../keygen.js";

// 呼び出しごとに {status, body} を返すハンドラで fetch を差し替える
function fakeFetch(handler) {
  return async (url, opts) => {
    const { status, body } = handler(String(url), opts ?? {});
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body == null ? "" : JSON.stringify(body)),
    };
  };
}

const base = { apiUrl: "https://api.keygen.sh", account: "acc", token: "prod-x" };

test("resolvePolicyId finds policy by name (case-insensitive)", async () => {
  const fetchImpl = fakeFetch(() => ({
    status: 200,
    body: { data: [
      { id: "pol_a", attributes: { name: "CoordyNavi_Subscription_1Year" } },
      { id: "pol_b", attributes: { name: "CoordyNavi_Promotion_1Year" } },
    ] },
  }));
  const id = await resolvePolicyId({ ...base, policyName: "coordynavi_promotion_1year", fetchImpl });
  assert.equal(id, "pol_b");
});

test("resolvePolicyId throws when not found", async () => {
  const fetchImpl = fakeFetch(() => ({ status: 200, body: { data: [] } }));
  await assert.rejects(
    resolvePolicyId({ ...base, policyName: "Nope", fetchImpl }),
    /見つかりません/
  );
});

test("createLicense returns id and key", async () => {
  const fetchImpl = fakeFetch((url, opts) => {
    assert.match(url, /\/v1\/accounts\/acc\/licenses$/);
    const sent = JSON.parse(opts.body);
    assert.equal(sent.data.attributes.name, "PPL_JPN_Acme_001");
    assert.equal(sent.data.relationships.policy.data.id, "pol_b");
    return { status: 201, body: { data: { id: "lic_1", attributes: { key: "KEY-1" } } } };
  });
  const r = await createLicense({ ...base, policyId: "pol_b", name: "PPL_JPN_Acme_001", fetchImpl });
  assert.deepEqual(r, { id: "lic_1", key: "KEY-1" });
});

test("createLicense throws with JSON:API error detail on non-2xx", async () => {
  const fetchImpl = fakeFetch(() => ({
    status: 422,
    body: { errors: [{ title: "Unprocessable", detail: "name has already been taken" }] },
  }));
  await assert.rejects(
    createLicense({ ...base, policyId: "pol_b", name: "dup", fetchImpl }),
    /name has already been taken/
  );
});

test("issueBatch continues past a failure and reports per-item status", async () => {
  const seen = [];
  const fetchImpl = fakeFetch((url, opts) => {
    const name = JSON.parse(opts.body).data.attributes.name;
    if (name.endsWith("002")) return { status: 422, body: { errors: [{ detail: "boom" }] } };
    return { status: 201, body: { data: { id: "id_" + name, attributes: { key: "key_" + name } } } };
  });
  const names = ["PPL_JPN_Acme_001", "PPL_JPN_Acme_002", "PPL_JPN_Acme_003"];
  const results = await issueBatch({ ...base, policyId: "pol_b", names, fetchImpl, onResult: (r) => seen.push(r) });
  assert.equal(results.length, 3);
  assert.equal(results[0].status, "ok");
  assert.equal(results[0].key, "key_PPL_JPN_Acme_001");
  assert.equal(results[1].status, "fail");
  assert.match(results[1].error, /boom/);
  assert.equal(results[2].status, "ok");
  assert.equal(seen.length, 3); // onResult は各件で呼ばれる
});
