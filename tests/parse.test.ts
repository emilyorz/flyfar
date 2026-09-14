import { readFileSync, unlinkSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { parseFlightsHtml, ParseError } from "../src/core/parse.js";

const html = readFileSync(new URL("./fixtures/flights.html", import.meta.url), "utf8");
const query = { from: "TPE", to: "NRT", date: "2026-10-20" };
const payload = JSON.parse(html.slice(html.indexOf("data:") + 5, html.lastIndexOf(", sideChannel:")));
const page = (data: unknown) => `<script class="ds:1">AF_initDataCallback({data:${JSON.stringify(data)}, sideChannel:{}});</script>`;

function expectParseError(input: string, path?: string) {
  let caught: unknown;
  try { parseFlightsHtml(input, query, "TWD"); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(ParseError);
  const error = caught as ParseError;
  expect(error.debugHtmlPath).toBeDefined();
  try {
    expect(readFileSync(error.debugHtmlPath!, "utf8")).toBe(input);
    if (path) expect(error.message).toContain(path);
  } finally { unlinkSync(error.debugHtmlPath!); }
}

describe("Google Flights HTML parsing", () => {
  it("keeps both result groups, including the cheaper best-flight group", () => {
    const result = parseFlightsHtml(html, query, "TWD");
    expect(result.flights.map(f => [f.type, f.price.amount, f.price.currency])).toEqual([
      ["SL", 5141, "TWD"], ["MM", 5240, "TWD"], ["GK", 5574, "TWD"],
    ]);
  });

  it("decodes omitted zero minutes and preserves overnight arrival dates", () => {
    const flights = parseFlightsHtml(html, query, "JPY").flights;
    const direct = flights.find(f => f.type === "MM")!;
    const connecting = flights.find(f => f.type === "GK")!;
    expect(direct.segments[0].departure).toEqual({ date: "2026-10-20", time: "02:00" });
    expect(connecting.segments[0].arrival.time).toBe("22:00");
    expect(connecting.segments[1].arrival).toEqual({ date: "2026-10-21", time: "09:05" });
  });

  it("uses itinerary duration including the overnight layover", () => {
    const flight = parseFlightsHtml(html, query, "TWD").flights.find(f => f.type === "GK")!;
    expect(flight.durationMinutes).toBe(825);
    expect(flight.stops).toBe(1);
    expect(flight.segments.map(s => s.durationMinutes)).toEqual([160, 90]);
  });

  it("accepts explicit empty groups without inventing flights", () => {
    expect(parseFlightsHtml(page([null, null, null, [[]]]), query, "TWD").flights).toEqual([]);
    expect(parseFlightsHtml(page([null, null, null, null]), query, "TWD").flights).toEqual([]);
  });

  it("reports missing or malformed result containers instead of no flights", () => {
    expectParseError(page([]), "payload");
    expectParseError(page([null, null, null, {}]), "payload[3]");
    expectParseError(page([null, null, null, ["changed"]]), "payload[3][0]");
  });

  it("never turns an invalid price into a successful zero-price flight", () => {
    const changed = structuredClone(payload);
    changed[2] = null;
    changed[3][0] = [changed[3][0][0]];
    changed[3][0][0][1][0][1] = "sold out";
    expectParseError(page(changed), "payload[3][0]");
  });

  it("rejects missing segments instead of returning an unusable flight", () => {
    const changed = structuredClone(payload);
    changed[2] = null;
    changed[3][0] = [changed[3][0][0]];
    changed[3][0][0][0][2] = [];
    expectParseError(page(changed), "payload[3][0]");
  });

  it("retains valid flights when a sibling entry is malformed", () => {
    const changed = structuredClone(payload);
    changed[3][0].push([[], [[null, "sold out"]]]);
    expect(parseFlightsHtml(page(changed), query, "TWD").flights.map(f => f.type)).toEqual(["SL", "MM", "GK"]);
  });

  it("saves exact diagnostic HTML when the script is missing or JSON is invalid", () => {
    expectParseError("<html>consent required</html>");
    expectParseError('<script class="ds:1">data:broken, sideChannel:{}</script>');
  });
});
