"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Beaker, Bot, Check, CheckCircle2, ChevronRight,
  CircleDot, Clipboard, Code2, Copy, Download, FileText, Github, LoaderCircle, LockKeyhole,
  Plus, RotateCcw, ShieldCheck, Sparkles, Terminal, TestTube2, Trash2, XCircle, Zap,
} from "lucide-react";
import { runAssertions, notRunResults } from "@/lib/assertions";
import { parseCurl, toCurl } from "@/lib/curl";
import { DEMO_SCENARIOS } from "@/lib/demos";
import { correctedCurl, generateJest, generatePostman } from "@/lib/exports";
import { generateReport } from "@/lib/report";
import { apiCaseSchema, type AnalysisResponse, type ApiCase, type AssertionResult, type HttpMethod } from "@/lib/types";

const EMPTY_CASE: ApiCase = { method: "POST", url: "", headers: [{ key: "Content-Type", value: "application/json" }], body: "", responseStatus: 400, responseBody: "", logs: "" };
type Tab = "tests" | "runner" | "report";

function downloadFile(name: string, content: string, type = "text/plain") {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch { setCopyState("failed"); }
    setTimeout(() => setCopyState("idle"), 1_500);
  }
  const visibleLabel = copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : label;
  return <button type="button" aria-label={label || "Copy to clipboard"} className="button-secondary !px-2.5 !py-1.5 text-xs" onClick={copy}>{copyState === "copied" ? <Check size={13} /> : <Copy size={13} />}{visibleLabel}</button>;
}

function StatusPill({ status }: { status: AssertionResult["status"] }) {
  const styles = status === "pass" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : status === "fail" ? "border-rose-400/20 bg-rose-400/10 text-rose-300" : "border-slate-400/15 bg-slate-400/[.07] text-slate-400";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${styles}`}>{status === "pass" ? <CheckCircle2 size={12} /> : status === "fail" ? <XCircle size={12} /> : <CircleDot size={12} />}{status}</span>;
}

export function Workspace() {
  const [apiCase, setApiCase] = useState<ApiCase>(EMPTY_CASE);
  const [curlInput, setCurlInput] = useState("");
  const [demoMode, setDemoMode] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [verification, setVerification] = useState({ status: 400, body: "" });
  const [assertionResults, setAssertionResults] = useState<AssertionResult[]>([]);
  const [tab, setTab] = useState<Tab>("tests");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [curlError, setCurlError] = useState("");

  useEffect(() => { fetch("/api/status").then((r) => r.json()).then((x: { configured: boolean }) => setConfigured(x.configured)).catch(() => setConfigured(false)); }, []);

  const analysis = result?.analysis;
  const curl = analysis ? correctedCurl(analysis) : "";
  const jest = analysis ? generateJest(apiCase, analysis) : "";
  const postman = analysis ? generatePostman(apiCase, analysis) : "";
  const report = analysis && result ? generateReport(apiCase, analysis, result.source, assertionResults) : "";

  function update<K extends keyof ApiCase>(key: K, value: ApiCase[K]) { setApiCase((current) => ({ ...current, [key]: value })); }
  function updateHeader(index: number, key: "key" | "value", value: string) { setApiCase((current) => ({ ...current, headers: current.headers.map((header, i) => i === index ? { ...header, [key]: value } : header) })); }
  function loadScenario(index: number) {
    const next = structuredClone(DEMO_SCENARIOS[index].apiCase);
    setApiCase(next); setVerification({ status: next.responseStatus, body: next.responseBody }); setResult(null); setAssertionResults([]); setError(""); setCurlInput(toCurl(next));
    window.scrollTo({ top: 210, behavior: "smooth" });
  }
  function importCurl() {
    try {
      const parsed = parseCurl(curlInput);
      setApiCase((current) => ({ ...current, ...parsed })); setCurlError("");
    } catch (err) { setCurlError(err instanceof Error ? err.message : "Could not parse cURL."); }
  }
  async function analyze() {
    const parsed = apiCaseSchema.safeParse(apiCase);
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" · ")); return; }
    setLoading(true); setError(""); setResult(null); setAssertionResults([]);
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiCase: parsed.data, demoMode }) });
      const payload = await response.json() as AnalysisResponse & { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error || "Analysis request failed.");
      setResult(payload); setAssertionResults(notRunResults(payload.analysis.testSpecs)); setVerification({ status: apiCase.responseStatus, body: apiCase.responseBody }); setTab("tests");
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed."); }
    finally { setLoading(false); }
  }
  function verify() { if (!analysis) return; setAssertionResults(runAssertions(analysis.testSpecs, Number(verification.status), verification.body)); }

  return <div className="min-h-screen">
    <header className="border-b border-white/[0.07] bg-[#080b12]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300"><Activity size={20} /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#080b12] bg-cyan-400" /></div>
          <div><div className="flex items-center gap-2"><h1 className="font-semibold tracking-tight text-white">API Doctor <span className="text-violet-400">AI</span></h1><span className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 sm:inline">Beta</span></div><p className="text-xs text-slate-500">Debug smarter. Test faster.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div role="status" aria-live="polite" title={configured === null ? "Checking BharatCode configuration" : configured ? "BharatCode is configured" : "BharatCode key is not configured"} className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs sm:px-3 ${configured ? "border-emerald-400/15 bg-emerald-400/[.06] text-emerald-300" : "border-amber-400/15 bg-amber-400/[.06] text-amber-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-400" : "bg-amber-400"}`} /><span className="hidden sm:inline">{configured === null ? "Checking provider" : configured ? "BharatCode ready" : "Key not configured"}</span></div>
          <a href="https://github.com/kanishik0011/API.-doctor.apiBharatCode.txt" target="_blank" rel="noreferrer noopener" aria-label="Open API Doctor AI repository on GitHub" title="Open GitHub repository" className="button-secondary !p-2.5 sm:!px-3"><Github size={15} /><span className="hidden sm:inline">GitHub</span></a>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <section className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div className="max-w-2xl"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-violet-400"><Sparkles size={14} /> Error-to-test agent</div><h2 className="text-2xl font-semibold tracking-[-.035em] text-white sm:text-3xl">From failed request to <span className="text-slate-500">reproducible proof.</span></h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Diagnose from supplied evidence, generate a safer corrected request, then verify real response data with deterministic assertions.</p></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DEMO_SCENARIOS.map((scenario, index) => <button type="button" onClick={() => loadScenario(index)} key={scenario.id} className="group min-w-[190px] rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-left transition hover:border-violet-400/25 hover:bg-violet-400/[0.04]"><div className="flex items-center justify-between text-xs font-medium text-slate-300"><span>{String(index + 1).padStart(2, "0")} · {scenario.name.split(" ").slice(0, 2).join(" ")}</span><ChevronRight size={14} className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-400" /></div><div className="mt-1 text-[11px] text-slate-600">{scenario.description}</div></button>)}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,.96fr)]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><div><div className="flex items-center gap-2 text-sm font-semibold text-white"><Terminal size={16} className="text-cyan-400" /> Request builder</div><p className="mt-1 text-xs text-slate-600">Describe the request and the failure you already observed.</p></div><button type="button" onClick={() => { setApiCase(EMPTY_CASE); setResult(null); setCurlInput(""); setError(""); }} className="button-secondary !p-2" aria-label="Reset form"><RotateCcw size={14} /></button></div>
          <div className="space-y-5 p-5">
            <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3"><div className="mb-2 flex items-center justify-between"><label className="eyebrow" htmlFor="curl">Import cURL</label><button type="button" onClick={importCurl} className="text-xs font-semibold text-violet-400 hover:text-violet-300">Parse command <ArrowRight className="inline" size={12} /></button></div><textarea id="curl" rows={2} className="field code resize-y !text-xs" value={curlInput} onChange={(e) => setCurlInput(e.target.value)} placeholder="curl --request POST 'https://api.example.com/v1/...'" />{curlError && <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-300"><AlertTriangle size={12} />{curlError}</p>}</div>
            <div className="grid gap-3 sm:grid-cols-[130px_1fr]"><div><label className="label" htmlFor="method">Method</label><select id="method" className="field code font-semibold text-cyan-300" value={apiCase.method} onChange={(e) => update("method", e.target.value as HttpMethod)}>{["GET", "POST", "PUT", "PATCH", "DELETE"].map((x) => <option key={x}>{x}</option>)}</select></div><div><label className="label" htmlFor="url">Request URL</label><input id="url" className="field code" value={apiCase.url} onChange={(e) => update("url", e.target.value)} placeholder="https://api.example.com/v1/resource" /></div></div>
            <div><div className="mb-2 flex items-center justify-between"><span className="label !mb-0">Headers</span><button type="button" className="text-xs text-slate-500 hover:text-white" onClick={() => update("headers", [...apiCase.headers, { key: "", value: "" }])}><Plus className="inline" size={13} /> Add header</button></div><div className="space-y-2">{apiCase.headers.map((header, index) => <div key={index} className="grid grid-cols-[minmax(90px,.42fr)_1fr_32px] gap-2"><input aria-label={`Header ${index + 1} name`} className="field code !py-2" value={header.key} onChange={(e) => updateHeader(index, "key", e.target.value)} placeholder="Header name" /><input aria-label={`Header ${index + 1} value`} className="field code !py-2" value={header.value} onChange={(e) => updateHeader(index, "value", e.target.value)} placeholder="Value" /><button type="button" aria-label={`Remove header ${index + 1}`} className="grid place-items-center rounded-lg text-slate-600 hover:bg-rose-400/10 hover:text-rose-400" onClick={() => update("headers", apiCase.headers.filter((_, i) => i !== index))}><Trash2 size={14} /></button></div>)}</div></div>
            <div><label className="label" htmlFor="body">Request body</label><textarea id="body" rows={5} className="field code resize-y !text-xs !leading-5" value={apiCase.body} onChange={(e) => update("body", e.target.value)} placeholder={'{"field":"value"}'} /></div>
            <div className="border-t border-white/[0.07] pt-5"><div className="mb-3 flex items-center gap-2"><Zap size={14} className="text-amber-400" /><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Observed failure</span></div><div className="grid gap-3 sm:grid-cols-[130px_1fr]"><div><label className="label" htmlFor="status">HTTP status</label><input id="status" type="number" min="100" max="599" className="field code" value={apiCase.responseStatus} onChange={(e) => update("responseStatus", Number(e.target.value))} /></div><div><label className="label" htmlFor="response">Response JSON / text</label><textarea id="response" rows={3} className="field code resize-y !text-xs" value={apiCase.responseBody} onChange={(e) => update("responseBody", e.target.value)} placeholder='{"error":"..."}' /></div></div><div className="mt-3"><label className="label" htmlFor="logs">Backend error logs <span className="normal-case tracking-normal text-slate-700">(optional)</span></label><textarea id="logs" rows={3} className="field code resize-y !text-xs" value={apiCase.logs} onChange={(e) => update("logs", e.target.value)} placeholder="Paste the relevant error excerpt. Remove personal or sensitive data first." /></div></div>
            <div className="rounded-lg border border-amber-300/10 bg-amber-300/[.035] p-3 text-xs leading-5 text-amber-100/60"><LockKeyhole size={13} className="mr-2 inline text-amber-300/70" />Authorization, cookies, tokens, and common secrets are redacted before analysis. Still remove personal and production-sensitive data before pasting.</div>
            <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><button type="button" role="switch" aria-label="Local demo mode" aria-checked={demoMode} onClick={() => setDemoMode(!demoMode)} className={`relative h-6 w-11 rounded-full transition ${demoMode ? "bg-violet-500" : "bg-slate-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${demoMode ? "left-6" : "left-1"}`} /></button><span><span className="block text-xs font-semibold text-slate-200">Local demo mode</span><span className="block text-[11px] text-slate-600">Deterministic sample analysis, no AI call</span></span></div><button type="button" onClick={analyze} disabled={loading} className="button-primary min-w-[170px]">{loading ? <><LoaderCircle size={16} className="animate-spin" />Analyzing evidence</> : <><Bot size={16} />Analyze API</>}</button></div>
            {!demoMode && configured === false && <p className="text-xs text-amber-300">Live mode needs BHARATCODE_API_KEY in <span className="code">.env.local</span>. The app will return a configuration error rather than substitute demo output.</p>}
            {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/15 bg-rose-400/[.06] p-3 text-sm text-rose-200"><AlertTriangle className="mt-0.5 shrink-0" size={15} /><span>{error}</span></div>}
          </div>
        </div>

        <div className="panel min-h-[620px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><div><div className="flex items-center gap-2 text-sm font-semibold text-white"><Bot size={16} className="text-violet-400" /> Analysis results</div><p className="mt-1 text-xs text-slate-600">Facts, hypotheses, and actions stay visibly separate.</p></div>{result && <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${result.source === "demo" ? "border-amber-400/15 bg-amber-400/[.06] text-amber-300" : "border-violet-400/20 bg-violet-400/[.08] text-violet-300"}`}>{result.source === "demo" ? "Local demo" : "BharatCode"}</span>}</div>
          {!analysis ? <div className="grid min-h-[560px] place-items-center p-8 text-center"><div><div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] text-slate-600"><Beaker size={26} /></div><h3 className="text-sm font-semibold text-slate-300">Awaiting an incident</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-600">Load an example or describe a failed request. No URL will be contacted during analysis.</p><div className="mx-auto mt-6 flex max-w-[290px] items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-slate-700"><span>Evidence</span><ArrowRight size={11} /><span>Diagnosis</span><ArrowRight size={11} /><span>Tests</span></div></div></div> : <div className="space-y-5 p-5">
            <div className="rounded-xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[.08] to-cyan-400/[.025] p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-md bg-violet-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">{analysis.category}</span><span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${analysis.confidence === "high" ? "bg-emerald-400" : analysis.confidence === "medium" ? "bg-amber-400" : "bg-slate-500"}`} /> {analysis.confidence} confidence</span></div><h3 className="text-lg font-semibold tracking-tight text-white">{analysis.summary}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{analysis.primaryCause}</p></div>
            <div><div className="mb-2 flex items-center gap-2"><ShieldCheck size={14} className="text-cyan-400" /><span className="eyebrow !text-cyan-300/80">Observed facts</span></div><div className="space-y-1.5">{analysis.observedFacts.map((fact, i) => <div key={i} className="flex gap-2 rounded-lg bg-cyan-400/[.035] px-3 py-2 text-xs leading-5 text-slate-300"><Check size={13} className="mt-1 shrink-0 text-cyan-400" />{fact}</div>)}</div></div>
            <div><div className="mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-400" /><span className="eyebrow !text-amber-300/80">Possible causes</span></div><div className="space-y-2">{analysis.possibleCauses.map((cause, i) => <div key={i} className="rounded-lg border border-white/[0.06] bg-black/15 p-3"><div className="flex items-start justify-between gap-3"><p className="text-xs font-medium leading-5 text-slate-200">{cause.cause}</p><span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-600">{cause.confidence}</span></div><p className="mt-1.5 text-[11px] leading-4 text-slate-600">Evidence: {cause.evidence.join(" · ")}</p></div>)}</div></div>
            <div><div className="mb-2 flex items-center gap-2"><ArrowRight size={14} className="text-violet-400" /><span className="eyebrow !text-violet-300/80">Recommended actions</span></div><ol className="space-y-2">{analysis.recommendedActions.map((action, i) => <li key={i} className="flex gap-3 text-xs leading-5 text-slate-300"><span className="code grid h-5 w-5 shrink-0 place-items-center rounded bg-violet-400/10 text-[10px] text-violet-300">{i + 1}</span>{action}</li>)}</ol></div>
            <div className="rounded-xl border border-white/[0.07] bg-[#080b12] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold text-white"><Code2 size={14} className="text-emerald-400" /> Proposed corrected request</div><CopyButton value={curl} /></div><pre className="code max-h-44 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-emerald-200/75">{curl}</pre><div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">{analysis.correctedRequest.explanation.map((x, i) => <p key={i} className="text-[11px] leading-4 text-slate-500">{x}</p>)}</div></div>
            {analysis.missingInformation.length > 0 && <div className="rounded-lg border border-amber-400/10 bg-amber-400/[.03] p-3"><p className="eyebrow mb-2 !text-amber-300/60">Still needed</p>{analysis.missingInformation.map((x, i) => <p key={i} className="text-[11px] leading-5 text-slate-500">• {x}</p>)}</div>}
          </div>}
        </div>
      </section>

      <section className="panel mt-5 overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] px-5 pt-4 sm:flex-row sm:items-end"><div className="pb-3"><h3 className="text-sm font-semibold text-white">Verification workspace</h3><p className="mt-1 text-xs text-slate-600">Generated artifacts and deterministic checks. Remote execution stays disabled.</p></div><div role="tablist" aria-label="Verification workspace" className="flex gap-1 overflow-x-auto">{([{ id: "tests", label: "Test cases", icon: TestTube2 }, { id: "runner", label: "Test runner", icon: Activity }, { id: "report", label: "Report", icon: FileText }] as const).map((item) => <button type="button" role="tab" aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition ${tab === item.id ? "border-violet-400 text-white" : "border-transparent text-slate-600 hover:text-slate-300"}`}><item.icon size={14} />{item.label}</button>)}</div></div>
        {!analysis ? <div className="grid min-h-52 place-items-center p-8 text-center"><div><TestTube2 size={23} className="mx-auto mb-3 text-slate-700" /><p className="text-xs text-slate-600">Validated test specifications will appear after analysis.</p></div></div> : <div className="p-5">
          {tab === "tests" && <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
            <div><div className="mb-3 flex items-center justify-between"><span className="eyebrow">Validated test specification</span><span className="text-[11px] text-slate-600">{analysis.testSpecs.length} cases</span></div><div className="space-y-3">{analysis.testSpecs.map((spec, index) => <div key={spec.id} className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="code grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-[10px] text-slate-500">{String(index + 1).padStart(2, "0")}</span><div><p className="text-sm font-medium text-slate-200">{spec.name}</p><p className="mt-1 text-xs leading-5 text-slate-600">{spec.explanation}</p></div></div><span className="code shrink-0 rounded bg-cyan-400/[.07] px-2 py-1 text-[10px] font-semibold text-cyan-300">HTTP {spec.expectedStatus}</span></div>{spec.assertions.length > 0 && <div className="mt-3 ml-10 flex flex-wrap gap-1.5">{spec.assertions.map((a, i) => <span key={i} className="code rounded border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[10px] text-slate-500">{a.path}: {a.type}{"expectedValue" in a ? ` = ${JSON.stringify(a.expectedValue)}` : ""}</span>)}</div>}</div>)}</div></div>
            <div className="space-y-3"><ExportCard title="Jest-compatible test" subtitle="Runnable in a developer-controlled environment" content={jest} filename="api-doctor.test.js" language="javascript" /><ExportCard title="Postman collection" subtitle="Collection v2.1 with deterministic checks" content={postman} filename="api-doctor.postman_collection.json" language="json" /></div>
          </div>}
          {tab === "runner" && <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><div className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><div className="mb-4 flex items-center gap-2"><Activity size={15} className="text-cyan-400" /><div><p className="text-sm font-semibold text-white">Local response assertion</p><p className="mt-0.5 text-[11px] text-slate-600">Paste a response you actually received.</p></div></div><label className="label" htmlFor="verify-status">Actual HTTP status</label><input id="verify-status" className="field code" type="number" min="100" max="599" value={verification.status} onChange={(e) => setVerification((x) => ({ ...x, status: Number(e.target.value) }))} /><label className="label mt-4" htmlFor="verify-body">Actual response JSON</label><textarea id="verify-body" rows={9} className="field code resize-y !text-xs !leading-5" value={verification.body} onChange={(e) => setVerification((x) => ({ ...x, body: e.target.value }))} /><button type="button" onClick={verify} className="button-primary mt-4 w-full"><TestTube2 size={15} />Run {analysis.testSpecs.length} assertions</button><p className="mt-3 text-[10px] leading-4 text-slate-600">Runs entirely in this browser. It does not contact the request URL or execute generated JavaScript.</p></div><div><div className="mb-3 flex items-center justify-between"><span className="eyebrow">Results</span><span className="text-[11px] text-slate-600">{assertionResults.filter((x) => x.status === "pass").length}/{assertionResults.length} passing</span></div><div className="space-y-3">{assertionResults.map((item) => <div key={item.testId} className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-200">{item.name}</p><StatusPill status={item.status} /></div><div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2"><div className="rounded bg-white/[0.025] p-2.5"><span className="eyebrow block mb-1">Expected</span><span className="text-slate-400">{item.expected}</span></div><div className="rounded bg-white/[0.025] p-2.5"><span className="eyebrow block mb-1">Actual</span><span className="text-slate-400">{item.actual}</span></div></div>{item.failures.length > 0 && <div className="mt-3 space-y-1">{item.failures.map((failure, i) => <p key={i} className="flex gap-2 text-[11px] leading-4 text-rose-300/80"><XCircle size={12} className="mt-0.5 shrink-0" />{failure}</p>)}</div>}</div>)}</div></div></div>}
          {tab === "report" && <div><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><span className="eyebrow block">Debugging report</span><p className="mt-1 text-xs text-slate-600">Secrets are redacted; verification state is preserved.</p></div><div className="flex gap-2"><CopyButton value={report} /><button type="button" className="button-secondary !px-2.5 !py-1.5 text-xs" onClick={() => downloadFile("api-doctor-report.md", report, "text/markdown")}><Download size={13} />Download .md</button></div></div><pre className="code max-h-[560px] overflow-auto rounded-xl border border-white/[0.07] bg-[#080b12] p-5 whitespace-pre-wrap text-[11px] leading-5 text-slate-400">{report}</pre></div>}
        </div>}
      </section>
      <footer className="flex flex-col justify-between gap-3 px-1 py-7 text-[11px] text-slate-700 sm:flex-row"><p>API Doctor AI · BharatCode Build League</p><p className="flex items-center gap-1.5"><ShieldCheck size={12} />No arbitrary outbound target requests. No fabricated verification.</p></footer>
    </main>
  </div>;
}

function ExportCard({ title, subtitle, content, filename, language }: { title: string; subtitle: string; content: string; filename: string; language: string }) {
  const preview = useMemo(() => content.split("\n").slice(0, 11).join("\n"), [content]);
  return <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#080b12]"><div className="flex items-start justify-between gap-3 border-b border-white/[0.06] p-3"><div className="flex gap-2"><Clipboard size={14} className="mt-0.5 text-violet-400" /><div><p className="text-xs font-semibold text-slate-200">{title}</p><p className="mt-0.5 text-[10px] text-slate-600">{subtitle}</p></div></div><div className="flex gap-1"><CopyButton value={content} label="" /><button type="button" aria-label={`Download ${title}`} className="button-secondary !px-2.5 !py-1.5" onClick={() => downloadFile(filename, content, language === "json" ? "application/json" : "text/javascript")}><Download size={13} /></button></div></div><div className="relative"><span className="absolute right-3 top-2 text-[9px] font-bold uppercase tracking-widest text-slate-700">{language}</span><pre className="code h-44 overflow-hidden whitespace-pre-wrap p-4 text-[10px] leading-4 text-slate-500">{preview}</pre><div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#080b12] to-transparent" /></div></div>;
}
