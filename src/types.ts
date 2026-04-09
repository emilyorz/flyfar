import { z } from "zod";

// --- CLI Input Schemas ---

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const SearchInputSchema = z.object({
  from: z.string().length(3).toUpperCase(),
  to: z.string().length(3).toUpperCase(),
  date: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
  return: z.string().regex(dateRegex).optional(),
  direct: z.boolean().default(false),
  airline: z.array(z.string()).optional(),
  seat: z.enum(["economy", "premium-economy", "business", "first"]).default("economy"),
  passengers: z.number().int().min(1).max(9).default(1),
  json: z.boolean().default(false),
  language: z.string().default("en-US"),
  currency: z.string().default("TWD"),
  proxy: z.string().optional(),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

export const MultiCityInputSchema = z.object({
  route: z.array(z.string().length(3)),
  dates: z.array(z.string().regex(dateRegex)),
  seat: z.enum(["economy", "premium-economy", "business", "first"]).default("economy"),
  passengers: z.number().int().min(1).max(9).default(1),
  json: z.boolean().default(false),
  language: z.string().default("en-US"),
  currency: z.string().default("TWD"),
  proxy: z.string().optional(),
});

export type MultiCityInput = z.infer<typeof MultiCityInputSchema>;

export const CheapestInputSchema = z.object({
  from: z.string().length(3).toUpperCase(),
  to: z.string().length(3).toUpperCase(),
  rangeStart: z.string().regex(dateRegex),
  rangeEnd: z.string().regex(dateRegex),
  stay: z.number().int().min(1).optional(),
  json: z.boolean().default(false),
  language: z.string().default("en-US"),
  currency: z.string().default("TWD"),
  proxy: z.string().optional(),
});

export type CheapestInput = z.infer<typeof CheapestInputSchema>;

// --- Flight Data Types ---

export type SeatType = "economy" | "premium-economy" | "business" | "first";
export type TripType = "round-trip" | "one-way" | "multi-city";

export interface FlightSegment {
  airline: string;
  flightNumber?: string;
  fromAirport: { code: string; name: string };
  toAirport: { code: string; name: string };
  departure: { date: string; time: string };
  arrival: { date: string; time: string };
  durationMinutes: number;
  planeType: string;
}

export interface FlightResult {
  type: string;
  airlines: string[];
  price: { amount: number; currency: string };
  durationMinutes: number;
  stops: number;
  segments: FlightSegment[];
  carbonEmission?: { grams: number; typicalGrams: number };
}

export interface SearchResponse {
  query: {
    from: string;
    to: string;
    date: string;
    returnDate?: string;
  };
  flights: FlightResult[];
  metadata: {
    fetchedAt: string;
    source: "google-flights";
    airlines?: Array<{ code: string; name: string }>;
  };
}

export interface CheapestResponse {
  query: {
    from: string;
    to: string;
    rangeStart: string;
    rangeEnd: string;
    stay?: number;
  };
  dates: Array<{
    date: string;
    cheapestPrice: number;
    currency: string;
    flightCount: number;
  }>;
  metadata: {
    fetchedAt: string;
    source: "google-flights";
  };
}

// --- Airline Aliases ---

export const AIRLINE_ALIASES: Record<string, string> = {
  // English short → IATA
  eva: "BR",
  ci: "CI",
  starlux: "JX",
  peach: "MM",
  scoot: "TR",
  tigerair: "IT",
  jal: "JL",
  ana: "NH",
  jetstar: "GK",
  cathay: "CX",
  // Chinese → IATA
  "\u9577\u69AE": "BR", // 長榮
  "\u83EF\u822A": "CI", // 華航
  "\u661F\u5B87": "JX", // 星宇
  "\u6A02\u6843": "MM", // 樂桃
  "\u9177\u822A": "TR", // 酷航
  "\u864E\u822A": "IT", // 虎航
  "\u65E5\u822A": "JL", // 日航
  "\u5168\u65E5\u7A7A": "NH", // 全日空
  "\u6377\u661F": "GK", // 捷星
  "\u570B\u6CF0": "CX", // 國泰
};

export function resolveAirline(input: string): string {
  const lower = input.toLowerCase().trim();
  return AIRLINE_ALIASES[lower] ?? input.toUpperCase();
}
