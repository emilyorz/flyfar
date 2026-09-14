import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import protobuf from "protobufjs";
import { describe, it, expect } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const preload = fileURLToPath(new URL("./fixtures/http.mjs", import.meta.url));
const Info = protobuf.loadSync(join(root, "proto/flights.proto")).lookupType("Info");
const search = ["search", "--from", "TPE", "--to", "NRT", "--date", "2026-10-20"];
const cheapest = ["cheapest", "--from", "TPE", "--to", "NRT", "--range", "2026-10-20", "2026-10-21"];
const multi = ["multi", "--route", "tpe,nrt,kix,tpe", "--dates", "2026-10-20,2026-10-22,2026-10-25"];

function cli(args: string[], response = "flights", timezone = "Asia/Taipei") {
  const scratch = mkdtempSync(join(tmpdir(), "flyfar-cli-test-"));
  const requests = join(scratch, "requests.txt");
  const opened = join(scratch, "opened.txt");
  try {
    const child = spawnSync(process.execPath, ["--import", "tsx", "--import", preload, "src/cli.ts", ...args], {
      cwd: root, encoding: "utf8", timeout: 15_000,
      env: { ...process.env, TZ: timezone, FLYFAR_TEST_RESPONSE: response, FLYFAR_TEST_REQUESTS: requests, FLYFAR_TEST_OPEN: opened },
    });
    if (child.error) throw child.error;
    let urls: string[] = [];
    try { urls = readFileSync(requests, "utf8").trim().split("\n"); } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    let openedUrls: string[] = [];
    try { openedUrls = readFileSync(opened, "utf8").trim().split("\n"); } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    for (const match of child.stderr.matchAll(/Debug HTML saved to: (.+)/g)) {
      try { unlinkSync(match[1].trim()); } catch { /* 同一路徑可能已移除。 */ }
    }
    return { code: child.status, stdout: child.stdout, stderr: child.stderr, openedUrls,
      queries: urls.map(url => Info.toObject(Info.decode(Buffer.from(new URL(url).searchParams.get("tfs")!, "base64")))) };
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

describe("CLI public contract with offline HTTP", () => {
  it("search emits sorted, parseable JSON and keeps progress off stdout", () => {
    const result = cli([...search, "--json", "--return", "2026-10-25", "--direct", "--airline", "長榮", "--passengers", "2"]);
    expect(result.code).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.flights.map((f: { price: { amount: number } }) => f.price.amount)).toEqual([5141, 5240, 5574]);
    expect(data.query.returnDate).toBe("2026-10-25");
    expect(result.stderr).toContain("Searching");
    expect(result.queries[0].trip).toBe(1);
    expect(result.queries[0].data[1]).toMatchObject({ date: "2026-10-25", maxStops: 0, airlines: ["BR"], fromAirport: { airport: "NRT" }, toAirport: { airport: "TPE" } });
  });

  it("expands paired returns without adding the round-trip total twice", () => {
    const result = cli([...search, "--return", "2026-10-25", "--json"], "roundtrip");
    expect(result.code, result.stderr).toBe(0);
    const outbound = JSON.parse(result.stdout).flights[0];
    expect(outbound.segments[0].flightNumber).toBe("MM620");
    expect(outbound.price.amount).toBe(8232);
    expect(outbound.priceScope).toBe("round-trip-from");
    expect(outbound.returnOptions.map((f: { price: { amount: number } }) => f.price.amount)).toEqual([8232, 8723]);
    expect(outbound.returnOptions[0]).toMatchObject({
      priceScope: "round-trip-total",
      baggage: { status: "unknown" },
      segments: [{ flightNumber: "MM625", fromAirport: { code: "NRT" }, toAirport: { code: "TPE" },
        departure: { date: "2026-10-25", time: "21:50" }, arrival: { date: "2026-10-26", time: "01:10" } }],
    });
    const link = new URL(outbound.deepLink);
    const selected = Info.toObject(Info.decode(Buffer.from(link.searchParams.get("tfs")!, "base64")));
    expect(selected.data[0].selectedFlights).toEqual([{ fromAirport: "TPE", date: "2026-10-20", toAirport: "NRT", airline: "MM", flightNumber: "620" }]);
    expect(selected.data[1].date).toBe("2026-10-25");
  });

  it("table and CSV expose return flight dates and unknown baggage", () => {
    const args = [...search, "--return", "2026-10-25"];
    const table = cli(args, "roundtrip");
    expect(table.code, table.stderr).toBe(0);
    expect(table.stdout).toContain("MM625");
    expect(table.stdout).toContain("2026-10-26");
    expect(table.stdout).toContain("行李：未知");
    const csv = cli([...args, "--output", "csv"], "roundtrip");
    expect(csv.code, csv.stderr).toBe(0);
    expect(csv.stdout).toContain("MM625");
    expect(csv.stdout).toContain("2026-10-26");
    expect(csv.stdout).toContain("round-trip-total");
    expect(csv.stdout).toContain("unknown");
  });

  it("cheapest links preserve both travel dates and distinguish unconfirmed baggage", () => {
    const result = cli([...cheapest, "--stay", "5", "--json"]);
    expect(result.code, result.stderr).toBe(0);
    const entry = JSON.parse(result.stdout).dates[0];
    const link = new URL(entry.deepLink);
    const query = Info.toObject(Info.decode(Buffer.from(link.searchParams.get("tfs")!, "base64")));
    expect(query.data.map((leg: { date: string }) => leg.date)).toEqual(["2026-10-20", "2026-10-25"]);
    expect(entry.priceScope).toBe("round-trip-from");
    expect(entry.baggage.status).toBe("unknown");
  });

  it("distinguishes an unavailable return from an upstream response for the wrong leg", () => {
    const args = [...search, "--return", "2026-10-25", "--json"];
    const empty = cli(args, "empty-return");
    expect(empty.code, empty.stderr).toBe(1);
    expect(JSON.parse(empty.stdout).flights.every((f: { returnOptions: unknown[] }) => f.returnOptions.length === 0)).toBe(true);
    const wrong = cli(args, "wrong-return");
    expect(wrong.code, wrong.stderr).toBe(2);
    expect(wrong.stdout).toBe("");
  });

  it("JSON takes precedence over CSV and table recommendation flags", () => {
    const result = cli([...search, "--json", "--recommend", "--output", "csv"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).flights[0].price.amount).toBe(5141);
  });

  it("search still renders human recommendations and CSV", () => {
    const table = cli([...search, "--recommend"]);
    expect(table.code).toBe(0);
    expect(table.stdout).toContain("Best:");
    expect(table.stdout).toContain("02:00");
    const csv = cli([...search, "--output", "csv"]);
    expect(csv.code).toBe(0);
    expect(csv.stdout).toContain("Thai Lion Air");
    expect(csv.stdout).not.toContain("┌");
  });

  it("multi accepts all legs and returns real parsed flights", () => {
    const result = cli([...multi, "--json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).flights.map((f: { type: string }) => f.type)).toEqual(["SL", "MM", "GK"]);
    expect(result.queries[0].trip).toBe(3);
    expect(result.queries[0].data.map((leg: { date: string }) => leg.date)).toEqual(["2026-10-20", "2026-10-22", "2026-10-25"]);
  });

  it("multi --open opens the encoded itinerary rather than silently ignoring the flag", () => {
    const result = cli([...multi, "--json", "--open"]);
    expect(result.code).toBe(0);
    expect(result.openedUrls).toHaveLength(1);
    const openedQuery = Info.toObject(Info.decode(Buffer.from(new URL(result.openedUrls[0]).searchParams.get("tfs")!, "base64")));
    expect(openedQuery.trip).toBe(3);
    expect(openedQuery.data.map((leg: { date: string }) => leg.date)).toEqual(["2026-10-20", "2026-10-22", "2026-10-25"]);
  });

  it("cheapest accepts two range dates and keeps UTC calendar dates in Taipei and across DST", () => {
    for (const timezone of ["Asia/Taipei", "America/New_York"]) {
      const result = cli([...cheapest, "--stay", "5", "--json"], "flights", timezone);
      expect(result.code, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout).dates).toMatchObject([
        { date: "2026-10-20", cheapestPrice: 5141, currency: "TWD", flightCount: 3 },
        { date: "2026-10-21", cheapestPrice: 5141, currency: "TWD", flightCount: 3 },
      ]);
      expect(result.queries.map(q => q.data[1].date).sort()).toEqual(["2026-10-25", "2026-10-26"]);
    }
    const dst = cli(["cheapest", "--from", "TPE", "--to", "NRT", "--range", "2026-03-08", "2026-03-09", "--stay", "1", "--json"], "flights", "America/New_York");
    expect(dst.code, dst.stderr).toBe(0);
    expect(dst.queries.map(q => q.data[1].date).sort()).toEqual(["2026-03-09", "2026-03-10"]);
  });

  it("all commands distinguish empty results (1) from parse failures (2)", () => {
    for (const args of [search, multi, cheapest]) {
      const empty = cli([...args, "--json"], "empty");
      expect(empty.code, empty.stderr).toBe(1);
      expect(JSON.parse(empty.stdout)).toHaveProperty(args[0] === "cheapest" ? "dates" : "flights");
      const failed = cli([...args, "--json"], "malformed");
      expect(failed.code, failed.stderr).toBe(2);
      expect(failed.stdout).toBe("");
      expect(failed.stderr).toContain("Error:");
    }
  });

  it("rejects invalid calendar dates, reversed dates and malformed routes before networking", () => {
    for (const args of [
      [...search.slice(0, -1), "2026-02-30"],
      [...search, "--return", "2026-10-19"],
      [...cheapest.slice(0, -2), "2026-10-21", "2026-10-20"],
      ["multi", "--route", "TPE,NRT,KIX", "--dates", "2026-10-20"],
      ["multi", "--route", "TPE,NRT,KIX", "--dates", "2026-10-22,2026-10-20"],
    ]) {
      const result = cli(args);
      expect(result.code, result.stderr).toBe(2);
      expect(result.queries).toEqual([]);
    }
  });

  it("reports commander usage errors with the documented error exit code", () => {
    const result = cli(["search", "--unknown"]);
    expect(result.code).toBe(2);
    expect(result.queries).toEqual([]);
  });
});
