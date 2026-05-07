import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(".");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("benchmarkAIProviders is admin-only and isolated from production routing", () => {
  const source = read("base44/functions/benchmarkAIProviders/entry.ts");
  const app = read("src/App.jsx");

  assert.ok(source.includes("user.role !== 'admin'"));
  assert.ok(source.includes("benchmark_function: \"benchmarkAIProviders\""));
  assert.ok(!app.includes("benchmarkAIProviders"));
});

test("benchmarkAIProviders uses the same non-UGC ConceptBank filters as production", () => {
  const source = read("base44/functions/benchmarkAIProviders/entry.ts");

  assert.ok(source.includes('const ACTIVE_CONCEPT_SOURCE_BATCH = "1000_Concepts_Briefi_10_display_clean"'));
  assert.ok(source.includes("is_active: true"));
  assert.ok(source.includes("source_batch: ACTIVE_CONCEPT_SOURCE_BATCH"));
  assert.ok(source.includes("industry_order: industryOrder"));
  assert.ok(source.includes("user_facing_video_style: videoStyle"));
  assert.ok(source.includes('const BANK_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי", "לימודי"]'));
  assert.ok(!source.includes("1000_UGC_Briefi_10_display_clean"));
});

test("benchmarkAIProviders validates returned ids against the candidate pool and forbids free invention", () => {
  const source = read("base44/functions/benchmarkAIProviders/entry.ts");

  assert.ok(source.includes("const candidateIdSet = new Set"));
  assert.ok(source.includes("!candidateIdSet.has(id)"));
  assert.ok(source.includes("all_ids_in_candidate_pool"));
  assert.ok(source.includes("Do NOT invent concepts."));
  assert.ok(source.includes("Every returned id MUST exactly match one candidate id from the pool."));
});

test("benchmark stays isolated while current published production flow is allowed to use OpenAI in approved places", () => {
  const benchmark = read("base44/functions/benchmarkAIProviders/entry.ts");
  const grokFlow = read("base44/functions/grokBriefiFlow/entry.ts");
  const conceptPicker = read("src/pages/GrokConceptPicker.jsx");
  const finalBrief = read("src/pages/FinalBrief.jsx");

  assert.ok(benchmark.includes("OPENAI_API_KEY"));
  assert.ok(benchmark.includes("https://api.openai.com/v1"));
  assert.ok(benchmark.includes("missing_env_var: \"OPENAI_API_KEY\""));

  assert.ok(grokFlow.includes("OPENAI_API_KEY"));
  assert.ok(grokFlow.includes("callOpenAIForConcepts"));
  assert.ok(grokFlow.includes("classifyWithOpenAI"));
  assert.ok(grokFlow.includes('provider_log: { provider_used: "openai", step_name: "concept_bank_strict", success: true }'));
  assert.ok(grokFlow.includes('provider_used: "openai"'));
  assert.ok(grokFlow.includes('step_name: "final_brief"'));
  assert.ok(grokFlow.includes("openai_assemble_used: true"));
  assert.ok(grokFlow.includes("grok_polish_applied"));
  assert.ok(!conceptPicker.includes("OPENAI_API_KEY"));
  assert.ok(finalBrief.includes('action: "improveFinalBrief"'));
  assert.ok(!conceptPicker.includes("benchmarkAIProviders"));
});
