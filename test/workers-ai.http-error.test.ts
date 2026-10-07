import { test } from "node:test";
import assert from "node:assert/strict";
import { runModel } from "../src/workers-ai.ts";

test("returns ok:false with the status code when the HTTP response is not ok", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 500, json: async () => ({}) }));
  const result = await runModel({ model: "x", body: {}, timeoutMs: 1000 });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error, "x 500");
});

test("returns ok:false instead of throwing when fetch rejects for a reason other than a timeout", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("network down");
  });
  const result = await runModel({ model: "x", body: {}, timeoutMs: 1000 });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error, "network down");
});
