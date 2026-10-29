import type { Analysis, ApiCase } from "@/lib/types";

export type DemoScenario = { id: string; name: string; description: string; apiCase: ApiCase };

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "jwt-401",
    name: "JWT authentication failure",
    description: "401 · Missing bearer token",
    apiCase: {
      method: "GET", url: "https://api.example.com/v1/profile",
      headers: [{ key: "Accept", value: "application/json" }], body: "",
      responseStatus: 401, responseBody: '{"error":"unauthorized","message":"Bearer token is required"}',
      logs: "AuthMiddleware: Authorization header missing for GET /v1/profile",
    },
  },
  {
    id: "validation-422",
    name: "Request validation failure",
    description: "422 · Required field missing",
    apiCase: {
      method: "POST", url: "https://api.example.com/v1/users",
      headers: [{ key: "Content-Type", value: "application/json" }], body: '{"name":"Asha","email":"not-an-email"}',
      responseStatus: 422, responseBody: '{"error":"validation_failed","fields":{"email":"must be a valid email","role":"is required"}}',
      logs: "ValidationError: email format rejected; role is required",
    },
  },
  {
    id: "server-500",
    name: "Backend server failure",
    description: "500 · Database connection error",
    apiCase: {
      method: "POST", url: "https://api.example.com/v1/orders",
      headers: [{ key: "Content-Type", value: "application/json" }], body: '{"productId":"prod_42","quantity":1}',
      responseStatus: 500, responseBody: '{"error":"internal_server_error","requestId":"req_demo_500"}',
      logs: "DatabaseConnectionError: connection pool exhausted while creating order",
    },
  },
];

function baseCorrected(apiCase: ApiCase) {
  return { method: apiCase.method, url: apiCase.url, headers: apiCase.headers, body: apiCase.body };
}

export function createDemoAnalysis(apiCase: ApiCase): Analysis {
  const commonFact = `The supplied response status is HTTP ${apiCase.responseStatus}.`;
  if (apiCase.responseStatus === 401 || apiCase.responseStatus === 403) {
    const hasAuth = apiCase.headers.some((header) => header.key.toLowerCase() === "authorization");
    return {
      category: apiCase.responseStatus === 401 ? "Authentication" : "Authorization",
      summary: `The request was rejected with HTTP ${apiCase.responseStatus} before the protected operation could complete.`,
      primaryCause: hasAuth ? "The supplied credential may be invalid or expired; the available evidence cannot confirm token validity." : "The request has no Authorization header, while the response indicates bearer authentication is required.",
      confidence: hasAuth ? "medium" : "high",
      observedFacts: [commonFact, hasAuth ? "An Authorization header was supplied." : "No Authorization header was supplied.", `Response body: ${apiCase.responseBody.slice(0, 240) || "No response body supplied."}`],
      possibleCauses: [{ cause: hasAuth ? "The bearer token is expired, malformed, or not accepted by this API." : "The bearer token is missing.", evidence: [hasAuth ? "The server rejected a request that includes an Authorization header." : "The headers contain no Authorization entry."], confidence: hasAuth ? "medium" : "high" }],
      recommendedActions: ["Obtain a valid token through the API's documented authentication flow.", "Send it as an Authorization: Bearer <VALID_TOKEN> header.", "Confirm the token audience, issuer, scopes, and expiry on the server if the failure continues."],
      correctedRequest: { ...baseCorrected(apiCase), headers: [...apiCase.headers.filter((h) => h.key.toLowerCase() !== "authorization"), { key: "Authorization", value: "Bearer <VALID_TOKEN>" }], explanation: ["Adds the bearer credential required by the observed authentication response.", "The placeholder must be replaced locally; no credential was invented."] },
      backendSuggestions: ["Log authentication failure reason codes without logging raw tokens.", "Verify signing key, issuer, audience, expiry, and required scopes."],
      missingInformation: ["A valid token and the endpoint's authentication documentation are needed to verify the proposed request."],
      testSpecs: [{ id: "authenticated-request", name: "Valid token is accepted", expectedStatus: 200, assertions: [], explanation: "Confirms that a valid bearer credential allows the documented success response." }, { id: "missing-token-error", name: "Missing token stays protected", expectedStatus: 401, assertions: [{ path: "error", type: "string", required: true }], explanation: "Confirms the endpoint consistently rejects unauthenticated access." }],
    };
  }
  if (apiCase.responseStatus === 400 || apiCase.responseStatus === 422) {
    return {
      category: "Request validation", summary: `The server parsed the request but rejected its input with HTTP ${apiCase.responseStatus}.`,
      primaryCause: "One or more submitted fields do not meet the endpoint's validation contract.", confidence: "high",
      observedFacts: [commonFact, `Submitted body: ${apiCase.body.slice(0, 240) || "No body supplied."}`, `Validation response: ${apiCase.responseBody.slice(0, 300) || "No response body supplied."}`],
      possibleCauses: [{ cause: "The email value is malformed and a required role field is absent.", evidence: ["The supplied validation response identifies email and role field errors."], confidence: "high" }],
      recommendedActions: ["Use a syntactically valid email address.", "Add the required role using a value allowed by the API contract.", "Validate the payload client-side against the same published schema."],
      correctedRequest: { ...baseCorrected(apiCase), body: '{"name":"Asha","email":"asha@example.com","role":"user"}', explanation: ["Replaces the malformed email with a valid format.", "Adds the role field named in the supplied validation response; confirm allowed role values in the API documentation."] },
      backendSuggestions: ["Return stable machine-readable field errors.", "Keep server and client validation schemas aligned."],
      missingInformation: ["The endpoint schema is required to confirm allowed role values and the exact success status."],
      testSpecs: [{ id: "valid-user", name: "Valid user payload succeeds", expectedStatus: 201, assertions: [{ path: "id", type: "string", required: true }, { path: "email", type: "string", required: true, expectedValue: "asha@example.com" }], explanation: "Checks the likely creation contract after correcting the rejected fields." }, { id: "invalid-user", name: "Invalid payload returns field errors", expectedStatus: 422, assertions: [{ path: "fields", type: "object", required: true }], explanation: "Confirms deterministic validation behavior." }],
    };
  }
  return {
    category: apiCase.responseStatus >= 500 ? "Server / dependency failure" : "HTTP request failure",
    summary: `The supplied request produced HTTP ${apiCase.responseStatus}; the failure appears to be on the server path.`,
    primaryCause: apiCase.logs ? "The supplied backend log points to a database connection-pool failure." : "The server returned an error, but the available client response is insufficient to identify its internal cause.",
    confidence: apiCase.logs ? "high" : "low", observedFacts: [commonFact, `Response body: ${apiCase.responseBody.slice(0, 240) || "No response body supplied."}`, ...(apiCase.logs ? [`Backend log: ${apiCase.logs.slice(0, 300)}`] : [])],
    possibleCauses: [{ cause: apiCase.logs ? "Database connections were unavailable when the handler attempted to create the resource." : "An unobserved application or dependency exception occurred.", evidence: [apiCase.logs || "Only a generic server response was supplied."], confidence: apiCase.logs ? "high" : "low" }],
    recommendedActions: ["Trace the request using its request ID and inspect the full server exception.", "Check database health, pool sizing, connection leaks, and timeout settings.", "Return a stable error envelope while keeping internal exception details server-side."],
    correctedRequest: { ...baseCorrected(apiCase), explanation: ["No client-side correction is justified by the supplied evidence; the request is preserved."] },
    backendSuggestions: ["Measure active, idle, and waiting database connections.", "Ensure connections are released in success and error paths.", "Add bounded retries only for transient, idempotent operations."],
    missingInformation: ["Database pool metrics, complete stack trace, and service health at the failure timestamp are needed for verification."],
    testSpecs: [{ id: "order-created", name: "Order creation recovers", expectedStatus: 201, assertions: [{ path: "id", type: "string", required: true }, { path: "status", type: "string", required: true }], explanation: "Run after the backend repair to verify the actual success contract." }, { id: "server-error-envelope", name: "Server error remains structured", expectedStatus: 500, assertions: [{ path: "error", type: "string", required: true }, { path: "requestId", type: "string", required: true }], explanation: "Checks the observed error contract without treating it as a successful fix." }],
  };
}
