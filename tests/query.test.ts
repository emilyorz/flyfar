import { describe, it, expect } from "vitest";
import protobuf from "protobufjs";
import { fileURLToPath } from "node:url";
import { buildTfsParam, buildFlightsUrl, type QueryParams } from "../src/core/query.js";
import { resolveAirline } from "../src/types.js";

type DecodedLeg = { fromAirport: { airport: string }; toAirport: { airport: string }; date: string };

const Info = protobuf.loadSync(fileURLToPath(new URL("../proto/flights.proto", import.meta.url))).lookupType("Info");
const decode = async (params: QueryParams) => Info.toObject(Info.decode(Buffer.from(await buildTfsParam(params), "base64")));
const base: QueryParams = { legs: [{ from: "TPE", to: "NRT", date: "2026-10-20" }], seat: "economy", trip: "one-way", passengers: 1, language: "zh-TW", currency: "TWD" };

describe("Google Flights protobuf query", () => {
  it("encodes explicit nonstop zero distinctly from an unrestricted query", async () => {
    const unrestricted = await decode(base);
    const direct = await decode({ ...base, legs: [{ ...base.legs[0], maxStops: 0, airlines: [resolveAirline("長榮"), resolveAirline("Peach")] }] });
    expect(unrestricted.data[0]).not.toHaveProperty("maxStops");
    expect(direct.data[0]).toEqual({ date: "2026-10-20", maxStops: 0, airlines: ["BR", "MM"], fromAirport: { airport: "TPE" }, toAirport: { airport: "NRT" } });
  });

  it("preserves round-trip reversal, passenger count and business cabin on the wire", async () => {
    const result = await decode({ ...base, trip: "round-trip", seat: "business", passengers: 2, legs: [...base.legs, { from: "NRT", to: "TPE", date: "2026-10-25" }] });
    expect(result.trip).toBe(1);
    expect(result.seat).toBe(3);
    expect(result.passengers).toEqual([1, 1]);
    expect(result.data.map((leg: DecodedLeg) => [leg.fromAirport.airport, leg.toAirport.airport, leg.date])).toEqual([["TPE", "NRT", "2026-10-20"], ["NRT", "TPE", "2026-10-25"]]);
  });

  it("preserves all multi-city legs in travel order", async () => {
    const result = await decode({ ...base, trip: "multi-city", legs: [...base.legs, { from: "NRT", to: "KIX", date: "2026-10-22" }, { from: "KIX", to: "TPE", date: "2026-10-25" }] });
    expect(result.trip).toBe(3);
    expect(result.data.map((leg: DecodedLeg) => [leg.fromAirport.airport, leg.toAirport.airport, leg.date])).toEqual([["TPE", "NRT", "2026-10-20"], ["NRT", "KIX", "2026-10-22"], ["KIX", "TPE", "2026-10-25"]]);
  });

  it("escapes protobuf base64 and carries locale and currency in the public link", () => {
    const url = new URL(buildFlightsUrl("+/a=", "zh-TW", "JPY"));
    expect(url.origin + url.pathname).toBe("https://www.google.com/travel/flights/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({ tfs: "+/a=", hl: "zh-TW", curr: "JPY" });
  });
});
