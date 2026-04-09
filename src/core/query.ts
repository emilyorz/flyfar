import protobuf from "protobufjs";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

import type { SeatType, TripType } from "../types.js";

const SEAT_MAP: Record<SeatType, number> = {
  economy: 1,
  "premium-economy": 2,
  business: 3,
  first: 4,
};

const TRIP_MAP: Record<TripType, number> = {
  "round-trip": 1,
  "one-way": 2,
  "multi-city": 3,
};

const PASSENGER_ADULT = 1;

export interface FlightLeg {
  date: string; // YYYY-MM-DD
  from: string; // IATA code
  to: string; // IATA code
  maxStops?: number;
  airlines?: string[];
}

export interface QueryParams {
  legs: FlightLeg[];
  seat: SeatType;
  trip: TripType;
  passengers: number; // adult count
  language: string;
  currency: string;
}

let _root: protobuf.Root | null = null;

function findProtoFile(): string {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  // Try multiple locations: works for both src dev mode and dist bundled mode
  const candidates = [
    path.resolve(thisDir, "../../proto/flights.proto"), // from src/core/
    path.resolve(thisDir, "../proto/flights.proto"), // from dist/
    path.resolve(process.cwd(), "proto/flights.proto"), // from cwd
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Cannot find proto/flights.proto — tried:\n${candidates.map((c) => `  ${c}`).join("\n")}`
  );
}

async function getRoot(): Promise<protobuf.Root> {
  if (_root) return _root;
  const protoPath = findProtoFile();
  _root = await protobuf.load(protoPath);
  return _root;
}

export async function buildTfsParam(params: QueryParams): Promise<string> {
  const root = await getRoot();
  const Info = root.lookupType("Info");

  const flightDataEntries = params.legs.map((leg) => {
    const entry: Record<string, unknown> = {
      date: leg.date,
      fromAirport: { airport: leg.from },
      toAirport: { airport: leg.to },
    };
    if (leg.maxStops !== undefined) {
      entry.maxStops = leg.maxStops;
    }
    if (leg.airlines && leg.airlines.length > 0) {
      entry.airlines = leg.airlines;
    }
    return entry;
  });

  const passengers = Array.from({ length: params.passengers }, () => PASSENGER_ADULT);

  const message = Info.create({
    data: flightDataEntries,
    seat: SEAT_MAP[params.seat],
    passengers,
    trip: TRIP_MAP[params.trip],
  });

  const buffer = Info.encode(message).finish();
  // Base64 encode for URL param
  return Buffer.from(buffer).toString("base64");
}

export function buildFlightsUrl(
  tfs: string,
  language: string,
  currency: string
): string {
  const base = "https://www.google.com/travel/flights/search";
  const params = new URLSearchParams({ tfs, hl: language, curr: currency });
  return `${base}?${params.toString()}`;
}

export function buildFlightsParams(
  tfs: string,
  language: string,
  currency: string
): Record<string, string> {
  return { tfs, hl: language, curr: currency };
}
