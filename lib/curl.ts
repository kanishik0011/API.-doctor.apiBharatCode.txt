import type { ApiCase } from "@/lib/types";

export type ParsedCurl = Pick<ApiCase, "method" | "url" | "headers" | "body">;

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaping = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (escaping) {
      if (char !== "\n" && char !== "\r") current += char;
      escaping = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) { tokens.push(current); current = ""; }
    } else current += char;
  }

  if (quote) throw new Error("Unclosed quote in cURL command.");
  if (escaping) current += "\\";
  if (current) tokens.push(current);
  return tokens;
}

export function parseCurl(input: string): ParsedCurl {
  const tokens = tokenize(input.trim());
  if (tokens[0]?.toLowerCase() !== "curl") throw new Error("Command must start with curl.");

  let method = "GET";
  let url = "";
  let body = "";
  const headers: { key: string; value: string }[] = [];

  const readValue = (index: number, flag: string) => {
    const value = tokens[index + 1];
    if (!value || value.startsWith("-")) throw new Error(`${flag} requires a value.`);
    return value;
  };

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (["-X", "--request"].includes(token)) {
      method = readValue(i, token).toUpperCase(); i += 1;
    } else if (["-H", "--header"].includes(token)) {
      const raw = readValue(i, token);
      const colon = raw.indexOf(":");
      if (colon < 1) throw new Error(`Invalid header: ${raw}`);
      headers.push({ key: raw.slice(0, colon).trim(), value: raw.slice(colon + 1).trim() });
      i += 1;
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(token)) {
      body = readValue(i, token); i += 1;
      if (method === "GET") method = "POST";
    } else if (["-u", "--user", "-A", "--user-agent", "--connect-timeout", "--max-time"].includes(token)) {
      i += 1;
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      url = token;
    } else if (!token.startsWith("-") && !url) {
      url = token;
    }
  }

  if (!url) throw new Error("No URL found in the cURL command.");
  if (!/^https?:\/\//i.test(url)) throw new Error("Only http:// and https:// URLs are supported.");
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) throw new Error(`Unsupported method: ${method}`);

  return { method: method as ParsedCurl["method"], url, headers, body };
}

export function toCurl(request: Pick<ApiCase, "method" | "url" | "headers" | "body">): string {
  const quote = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`;
  const parts = [`curl --request ${request.method}`, quote(request.url)];
  request.headers.filter((h) => h.key).forEach((h) => parts.push(`--header ${quote(`${h.key}: ${h.value}`)}`));
  if (request.body && request.method !== "GET") parts.push(`--data-raw ${quote(request.body)}`);
  return parts.join(" \\\n  ");
}
