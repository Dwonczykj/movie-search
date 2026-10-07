import { test } from "node:test";
import assert from "node:assert/strict";
import { runModel, parseEmbeddings, embedTexts } from "../src/workers-ai.ts";

test("fails the Zod schema when a vector isn't 384 numbers", () => {
  const result = parseEmbeddings({ raw: { data: [[1, 2, 3]] } });
  assert.equal(result.ok, false);
});

test("fails the call when the data array is shorter than the input batch", async (t) => {
  const vector384 = Array.from({ length: 384 }, () => 0);
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ result: { data: [vector384] } }),
  }));
  const result = await embedTexts({ texts: ["a", "b"], timeoutMs: 1000 });
  assert.equal(result.ok, false);
});

test("returns ok:false once timeoutMs elapses instead of hanging on a call that never resolves", async (t) => {
  t.mock.method(globalThis, "fetch", (_url: string, options: { signal: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
  const result = await runModel({ model: "x", body: {}, timeoutMs: 50 });
  assert.equal(result.ok, false);
});
