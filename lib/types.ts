import { z } from "zod";

export const httpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const jsonTypeSchema = z.enum(["string", "number", "boolean", "object", "array", "null"]);

const httpUrlSchema = z.string().url("Enter a complete http(s) URL").max(2_048)
  .refine((value) => /^https?:\/\//i.test(value), "Only http(s) URLs are supported")
  .refine((value) => {
    try { const url = new URL(value); return !url.username && !url.password; }
    catch { return false; }
  }, "Credentials embedded in URLs are not allowed");

export const headerSchema = z.object({
  key: z.string().trim().max(200),
  value: z.string().max(4_000),
});

export const apiCaseSchema = z.object({
  method: httpMethodSchema,
  url: httpUrlSchema,
  headers: z.array(headerSchema).max(50),
  body: z.string().max(50_000),
  responseStatus: z.coerce.number().int().min(100).max(599),
  responseBody: z.string().max(50_000),
  logs: z.string().max(50_000),
});

export const fieldAssertionSchema = z.object({
  path: z.string().min(1).max(300),
  type: jsonTypeSchema,
  required: z.boolean(),
  expectedValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export const testSpecSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  expectedStatus: z.number().int().min(100).max(599),
  assertions: z.array(fieldAssertionSchema).max(12),
  explanation: z.string().min(1).max(1_000),
});

export const causeSchema = z.object({
  cause: z.string().min(1).max(1_000),
  evidence: z.array(z.string().min(1).max(1_000)).max(6),
  confidence: confidenceSchema,
});

export const correctedRequestSchema = z.object({
  method: httpMethodSchema,
  url: httpUrlSchema,
  headers: z.array(headerSchema).max(50),
  body: z.string().max(50_000),
  explanation: z.array(z.string().min(1).max(1_000)).min(1).max(8),
});

export const analysisSchema = z.object({
  category: z.string().min(1).max(120),
  summary: z.string().min(1).max(2_000),
  primaryCause: z.string().min(1).max(2_000),
  confidence: confidenceSchema,
  observedFacts: z.array(z.string().min(1).max(1_000)).min(1).max(8),
  possibleCauses: z.array(causeSchema).min(1).max(5),
  recommendedActions: z.array(z.string().min(1).max(1_000)).min(1).max(8),
  correctedRequest: correctedRequestSchema,
  backendSuggestions: z.array(z.string().min(1).max(1_000)).max(8),
  missingInformation: z.array(z.string().min(1).max(1_000)).max(8),
  testSpecs: z.array(testSpecSchema).min(1).max(8),
});

export const analyzeRequestSchema = z.object({
  apiCase: apiCaseSchema,
  demoMode: z.boolean().default(false),
});

export type HttpMethod = z.infer<typeof httpMethodSchema>;
export type ApiCase = z.infer<typeof apiCaseSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type TestSpec = z.infer<typeof testSpecSchema>;
export type FieldAssertion = z.infer<typeof fieldAssertionSchema>;
export type AnalysisSource = "bharatcode" | "demo";
export type AnalysisResponse = { analysis: Analysis; source: AnalysisSource };
export type AssertionStatus = "pass" | "fail" | "not-run";
export type AssertionResult = {
  testId: string;
  name: string;
  status: AssertionStatus;
  expected: string;
  actual: string;
  failures: string[];
};
