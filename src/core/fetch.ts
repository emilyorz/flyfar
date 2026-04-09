import { writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const FLIGHTS_URL = "https://www.google.com/travel/flights/search";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Browser-like headers to reduce chance of being blocked
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  Referer: "https://www.google.com/travel/flights",
};

export interface FetchOptions {
  tfs: string;
  language: string;
  currency: string;
  proxy?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveDebugHtml(html: string): string {
  const filename = `flyfar-debug-${Date.now()}.html`;
  const filepath = path.join(tmpdir(), filename);
  writeFileSync(filepath, html, "utf-8");
  return filepath;
}

export async function fetchFlightsHtml(options: FetchOptions): Promise<string> {
  const url = new URL(FLIGHTS_URL);
  url.searchParams.set("tfs", options.tfs);
  url.searchParams.set("hl", options.language);
  url.searchParams.set("curr", options.currency);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      process.stderr.write(
        `  Retry ${attempt}/${MAX_RETRIES - 1} after ${delay}ms...\n`
      );
      await sleep(delay);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url.toString(), {
        headers: BROWSER_HEADERS,
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      if (html.length < 1000) {
        throw new Error(
          `Response too short (${html.length} bytes) — likely blocked by Google`
        );
      }

      return html;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error));
      process.stderr.write(
        `  Fetch attempt ${attempt + 1} failed: ${lastError.message}\n`
      );
    }
  }

  throw new Error(
    `Failed to fetch flights after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

export { saveDebugHtml };
