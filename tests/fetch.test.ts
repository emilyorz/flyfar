import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFlightsHtml } from "../src/core/fetch.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const noDirect = fileURLToPath(new URL("./fixtures/no-direct.mjs", import.meta.url));

async function listen(server: Server): Promise<number> {
  const { promise, resolve } = Promise.withResolvers<void>();
  server.listen(0, "127.0.0.1", resolve);
  await promise;
  return (server.address() as AddressInfo).port;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("fetch transport (offline, local servers only)", () => {
  it("--proxy routes the search request through the proxy instead of connecting directly", async () => {
    const tunnels: string[] = [];
    const proxy = createServer();
    proxy.on("connect", (req, socket) => {
      tunnels.push(req.url ?? "");
      socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    });
    const port = await listen(proxy);
    try {
      const child = spawn(process.execPath, [
        "--import", "tsx", "--import", noDirect, "src/cli.ts",
        "search", "--from", "TPE", "--to", "NRT", "--date", "2026-10-20", "--proxy", `http://127.0.0.1:${port}`,
      ], { cwd: root });
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      const closed = Promise.withResolvers<number | null>();
      child.on("close", closed.resolve);
      const code = await closed.promise;
      expect(tunnels.length).toBeGreaterThan(0);
      expect(tunnels.every((target) => target === "www.google.com:443")).toBe(true);
      expect(stderr).not.toContain("direct connection attempted");
      expect(code).toBe(2);
      expect(stderr).toContain("Failed to fetch flights after 3 attempts");
    } finally {
      proxy.closeAllConnections();
      proxy.close();
    }
  }, 15_000);

  it("a response body that stalls after the headers fails with a timeout error inside the configured limit", async () => {
    const upstream = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html", "Content-Length": "100000" });
      res.write("<html>".padEnd(500, " "));
    });
    const port = await listen(upstream);
    const realFetch = globalThis.fetch;
    // 只把 Google 網址改指向本機伺服器；signal 與其餘選項原樣交給真正的 fetch。
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      const target = new URL(url);
      return realFetch(`http://127.0.0.1:${port}${target.pathname}${target.search}`, init);
    });
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const started = Date.now();
    try {
      await expect(fetchFlightsHtml({ tfs: "x", language: "en", currency: "USD", timeoutMs: 300 }))
        .rejects.toThrow(/timed out after 300ms/i);
      expect(Date.now() - started).toBeLessThan(8_000);
    } finally {
      stderr.mockRestore();
      upstream.closeAllConnections();
      upstream.close();
    }
  }, 10_000);
});
