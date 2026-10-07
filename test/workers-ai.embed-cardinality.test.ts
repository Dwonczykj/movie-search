import { test } from "node:test";
import assert from "node:assert/strict";
import { embedTexts } from "../src/workers-ai.ts";

test("fails the call when the data array has more vectors than the input batch", async (t) => {
  const vector384 = Array.from({ length: 384 }, () => 0);
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ result: { data: [vector384, vector384] } }),
  }));
  const result = await embedTexts({ texts: ["a"], timeoutMs: 1000 });
  assert.equal(result.ok, false);
});
