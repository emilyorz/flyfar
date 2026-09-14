import { z } from "zod";

// --- CLI Input Schemas ---

const dateSchema = z.iso.date();

export const SearchInputSchema = z.object({
  from: z.string().length(3).toUpperCase(),
  to: z.string().length(3).toUpperCase(),
  date: dateSchema,
  return: dateSchema.optional(),
  direct: z.boolean().default(false),
  airline: z.array(z.string()).optional(),
  seat: z
    .enum(["economy", "premium-economy", "business", "first"])
    .default("economy"),
  passengers: z.number().int().min(1).max(9).default(1),
  sort: z.enum(["price", "duration", "departure", "stops"]).default("price"),
  recommend: z.boolean().default(false),
  open: z.boolean().default(false),
  output: z.enum(["table", "json", "csv"]).default("table"),
  json: z.boolean().default(false),
  language: z.string().default("en-US"),
  currency: z.string().default("TWD"),
  proxy: z.string().optional(),
}).refine((input) => !input.return || input.return >= input.date, {
  path: ["return"],
  message: "回程日期不得早於出發日期",
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

export const MultiCityInputSchema = z.object({
  route: z.array(z.string().length(3)).min(2),
  dates: z.array(dateSchema),
  seat: z
    .enum(["economy", "premium-economy", "business", "first"])
    .default("economy"),
  passengers: z.number().int().min(1).max(9).default(1),
  json: z.boolean().default(false),
  open: z.boolean().default(false),
  language: z.string().default("en-US"),
  currency: z.string().default("TWD"),
  proxy: z.string().optional(),
}).refine((input) => input.dates.length === input.route.length - 1, {
  path: ["dates"],
  message: "每個航段需要一個日期",
}).refine((input) => input.dates.every((date, index) => index === 0 || date >= input.dates[index - 1]), {
  path: ["dates"],
  message: "航段日期必須依時間先後排列",
});

export type MultiCityInput = z.infer<typeof MultiCityInputSchema>;

export const CheapestInputSchema = z.object({
  from: z.string().length(3).toUpperCase(),
  to: z.string().length(3).toUpperCase(),
  rangeStart: dateSchema,
  rangeEnd: dateSchema,
  stay: z.number().int().min(1).optional(),
  concurrency: z.number().int().min(1).max(10).default(5),
  json: z.boolean().default(false),
  language: z.string().default("en-US"),
  currency: z.string().default("TWD"),
  proxy: z.string().optional(),
}).refine((input) => input.rangeEnd >= input.rangeStart, {
  path: ["rangeEnd"],
  message: "結束日期不得早於開始日期",
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
  deepLink?: string;
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
