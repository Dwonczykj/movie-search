import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/csv.ts";

test("keeps a comma inside a quoted field as part of that field, not a column break", () => {
  const rows = parseCsv({ text: 'Title,Overview\n"Shark Night","A beach town is attacked, by a shark"\n' });
  assert.deepEqual(rows, [
    ["Title", "Overview"],
    ["Shark Night", "A beach town is attacked, by a shark"],
  ]);
});

test("keeps an embedded newline inside a quoted field instead of ending the row early", () => {
  const rows = parseCsv({ text: 'Title,Overview\n"Shark Night","Line one\nLine two"\n' });
  assert.deepEqual(rows, [
    ["Title", "Overview"],
    ["Shark Night", "Line one\nLine two"],
  ]);
});

test("unescapes a doubled quote inside a quoted field to a single literal quote", () => {
  const rows = parseCsv({ text: 'Title,Overview\n"Shark ""Night""","fine"\n' });
  assert.deepEqual(rows, [
    ["Title", "Overview"],
    ['Shark "Night"', "fine"],
  ]);
});

test("treats a CRLF line ending as one row break, not two", () => {
  const rows = parseCsv({ text: "Title,Overview\r\nShark Night,fine\r\n" });
  assert.deepEqual(rows, [
    ["Title", "Overview"],
    ["Shark Night", "fine"],
  ]);
});

test("captures the final row even when the text has no trailing newline", () => {
  const rows = parseCsv({ text: "Title,Overview\nShark Night,fine" });
  assert.deepEqual(rows, [
    ["Title", "Overview"],
    ["Shark Night", "fine"],
  ]);
});
