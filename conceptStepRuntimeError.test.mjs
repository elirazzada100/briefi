import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("concept picker sends normalized style, project context, and focus state to grokBriefiFlow", () => {
  const source = read("src/pages/GrokConceptPicker.jsx");

  assert.ok(source.includes("function normalizeSelectedVideoStyle(value) {"));
  assert.ok(source.includes('if (normalized === "trendy") return "טרנדי";'));
  assert.ok(source.includes("selectedVideoStyle,"));
  assert.ok(source.includes("project_id: projectId,"));
  assert.ok(source.includes("businessAnalysis,"));
  assert.ok(source.includes("specialFocusText,"));
  assert.ok(source.includes("specialFocusEnabled,"));
});

test("concept picker accepts both wrapped and direct Base44 function payload shapes", () => {
  const source = read("src/pages/GrokConceptPicker.jsx");

  assert.ok(source.includes("function extractInvokePayload(result) {"));
  assert.ok(source.includes("return result?.data ?? result ?? {};"));
  assert.ok(source.includes("const payload = extractInvokePayload(res);"));
  assert.ok(source.includes("if (payload?.classifiedIndustry) {"));
  assert.ok(source.includes("if (!Array.isArray(payload?.concepts)) {"));
});

test("concept picker surfaces specific recoverable Hebrew errors instead of generic crash copy", () => {
  const source = read("src/pages/GrokConceptPicker.jsx");

  assert.ok(source.includes("function extractReadableError(error, fallbackMessage) {"));
  assert.ok(source.includes('return "הסגנון שנבחר לא נתמך כרגע. חזרו לבחירת סגנון ונסו שוב.";'));
  assert.ok(source.includes('return "חסר מידע על הפרויקט. חזרו רגע אחורה ונסו שוב.";'));
  assert.ok(source.includes('return payload.message || "לא נמצאו קונספטים מתאימים לבנק הקונספטים. צריך לבדוק קטגוריה/סגנון או לוודא שהבנק נטען.";'));
  assert.ok(source.includes('return payload.message || "הצלחנו למצוא קונספטים, אבל העיבוד נתקע. נסו שוב בעוד רגע.";'));
  assert.ok(!source.includes('setError("משהו נתקע בדרך. נסו שוב בעוד רגע.")'));
});

test("backend concept action returns precise errors for missing context, unsupported style, empty pool, and post-pool Grok failure", () => {
  const source = read("base44/functions/grokBriefiFlow/entry.ts");

  assert.ok(source.includes('error: "MISSING_PROJECT_CONTEXT"'));
  assert.ok(source.includes('message: "חסר מידע על הפרויקט. חזרו רגע אחורה ונסו שוב."'));
  assert.ok(source.includes('error: "UNSUPPORTED_VIDEO_STYLE"'));
  assert.ok(source.includes('message: "הסגנון שנבחר לא נתמך כרגע. חזרו לבחירת סגנון ונסו שוב."'));
  assert.ok(source.includes('message: "לא נמצאו קונספטים מתאימים לבנק הקונספטים. צריך לבדוק קטגוריה/סגנון או לוודא שהבנק נטען."'));
  assert.ok(source.includes('message: "הצלחנו למצוא קונספטים, אבל העיבוד נתקע. נסו שוב בעוד רגע."'));
});
