import { correctedCurl } from "@/lib/exports";
import { sanitizeApiCase, sanitizeRequest } from "@/lib/sanitize";
import type { Analysis, AnalysisSource, ApiCase, AssertionResult } from "@/lib/types";

export function generateReport(apiCase: ApiCase, analysis: Analysis, source: AnalysisSource, results: AssertionResult[], timestamp = new Date()): string {
  const safe = sanitizeApiCase(apiCase);
  const safeAnalysis = { ...analysis, correctedRequest: sanitizeRequest(analysis.correctedRequest) };
  const lines = [
    "# API Doctor AI — Debugging report", "", `Generated: ${timestamp.toISOString()}`, `Analysis source: ${source === "demo" ? "Local deterministic demo (not an AI diagnosis)" : "BharatCode qwen-3.8-27b"}`, "",
    "## Original request", "", `- Method: ${safe.method}`, `- URL: ${safe.url}`, `- Headers: ${safe.headers.map((h) => `${h.key}: ${h.value}`).join("; ") || "None"}`, `- Body: ${safe.body || "None"}`, "",
    "## Observed failure", "", `- Status: ${safe.responseStatus}`, `- Response: ${safe.responseBody || "None"}`, `- Logs: ${safe.logs || "None supplied"}`, "",
    "## Diagnosis", "", `- Category: ${analysis.category}`, `- Confidence: ${analysis.confidence}`, `- Summary: ${analysis.summary}`, `- Likely cause: ${analysis.primaryCause}`, "", "### Observed facts", ...analysis.observedFacts.map((x) => `- ${x}`), "", "### Possible causes", ...analysis.possibleCauses.map((x) => `- [${x.confidence}] ${x.cause} — Evidence: ${x.evidence.join("; ")}`), "", "### Recommended actions", ...analysis.recommendedActions.map((x) => `- ${x}`), "",
    "## Proposed request (not automatically executed)", "", "```bash", correctedCurl(safeAnalysis), "```", "", ...safeAnalysis.correctedRequest.explanation.map((x) => `- ${x}`), "",
    "## Generated test cases", "", ...analysis.testSpecs.map((x) => `- ${x.name}: expect HTTP ${x.expectedStatus}; ${x.explanation}`), "",
    "## Local verification results", "", ...(results.length ? results.map((x) => `- ${x.name}: ${x.status.toUpperCase()} — expected ${x.expected}; actual ${x.actual}${x.failures.length ? ` — ${x.failures.join(" ")}` : ""}`) : ["- NOT RUN"]), "",
    "## Unverified assumptions / missing information", "", ...(analysis.missingInformation.length ? analysis.missingInformation.map((x) => `- ${x}`) : ["- None reported by the analysis."]), "", "> A proposed request is not proof of a fix. Only the local response assertions above reflect actual verification, and they validate user-supplied response data rather than executing the remote API.", "",
  ];
  return lines.join("\n");
}
