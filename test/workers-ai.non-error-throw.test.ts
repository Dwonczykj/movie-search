import { test } from "node:test";
import assert from "node:assert/strict";
import { runModel } from "../src/workers-ai.ts";

test("stringifies a thrown non-Error value instead of reading a missing .message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw "boom";
  });
  const result = await runModel({ model: "x", body: {}, timeoutMs: 1000 });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error, "boom");
});
