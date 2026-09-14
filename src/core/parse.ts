import type { FlightResult, FlightSegment, SearchResponse } from "../types.js";
import { saveDebugHtml } from "./fetch.js";
import { z } from "zod";

const airportSchema = z.object({ code: z.string().regex(/^[A-Z]{3}$/), name: z.string() });
const dateTimeSchema = z.object({ date: z.iso.date(), time: z.iso.time({ precision: -1 }) });
const flightSchema = z.object({
  type: z.string(),
  airlines: z.array(z.string()).min(1),
  price: z.object({ amount: z.number().nonnegative(), currency: z.string() }),
  durationMinutes: z.number().int().positive(),
  stops: z.number().int().nonnegative(),
  segments: z.array(z.object({
    airline: z.string(),
    airlineCode: z.string().optional(),
    flightNumber: z.string().optional(),
    fromAirport: airportSchema,
    toAirport: airportSchema,
    departure: dateTimeSchema,
    arrival: dateTimeSchema,
    durationMinutes: z.number().int().positive(),
    planeType: z.string(),
  })).min(1),
  carbonEmission: z.object({ grams: z.number().nonnegative(), typicalGrams: z.number().nonnegative() }).optional(),
});

/**
 * Defensive array access — returns undefined instead of throwing on out-of-bounds.
 * Logs a meaningful path when a required field is missing.
 */
function safeGet<T>(arr: unknown, index: number, path: string): T | undefined {
  if (!Array.isArray(arr) || index >= arr.length || index < 0) {
    return undefined;
  }
  return arr[index] as T;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ParseError(`Google Flights response structure changed at ${path} — expected array`);
  }
  return value;
}

export class ParseError extends Error {
  constructor(
    message: string,
    public debugHtmlPath?: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Extract the embedded JSON data from Google Flights HTML response.
 * Google embeds flight data in a <script class="ds:1"> tag.
 */
function extractJsonFromHtml(html: string): unknown {
  // Look for script tag with class ds:1
  const scriptPattern = /<script[^>]*class="ds:1"[^>]*>([\s\S]*?)<\/script>/;
  const match = html.match(scriptPattern);

  if (!match || !match[1]) {
    throw new ParseError(
      "Could not find script.ds:1 in HTML — Google may have changed their page structure",
    );
  }

  const scriptContent = match[1];

  // The script contains: ...data:JSONDATA,...
  // We need to extract the JSON data after "data:"
  const dataIdx = scriptContent.indexOf("data:");
  if (dataIdx === -1) {
    throw new ParseError(
      'Could not find "data:" marker in script.ds:1 content',
    );
  }

  const afterData = scriptContent.substring(dataIdx + 5);
  // Data ends before the last comma in the script
  const lastComma = afterData.lastIndexOf(",");
  if (lastComma === -1) {
    throw new ParseError("Could not find end of data payload in script.ds:1");
  }

  const jsonStr = afterData.substring(0, lastComma);

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new ParseError(
      `Failed to parse JSON from script.ds:1 (length: ${jsonStr.length})`,
    );
  }
}

function formatDate(dateTuple: unknown): string {
  if (!Array.isArray(dateTuple) || dateTuple.length < 3) {
    return "unknown";
  }
  const [year, month, day] = dateTuple;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTime(timeTuple: unknown): string {
  if (!Array.isArray(timeTuple)) {
    return "unknown";
  }
  // Google 省略值為零的時間欄位，例如 [2] 代表 02:00。
  const [hour, minute] = timeTuple;
  return `${String(hour ?? 0).padStart(2, "0")}:${String(minute ?? 0).padStart(2, "0")}`;
}

/**
 * Parse a single flight segment from the response array.
 */
function parseSegment(segment: unknown[], path: string): FlightSegment {
  const fromCode = safeGet<string>(segment, 3, `${path}.fromCode`) ?? "???";
  const fromName = safeGet<string>(segment, 4, `${path}.fromName`) ?? "";
  const toName = safeGet<string>(segment, 5, `${path}.toName`) ?? "";
  const toCode = safeGet<string>(segment, 6, `${path}.toCode`) ?? "???";
  const departureTime = safeGet(segment, 8, `${path}.departureTime`);
  const arrivalTime = safeGet(segment, 10, `${path}.arrivalTime`);
  const duration = safeGet<number>(segment, 11, `${path}.duration`) ?? 0;
  const planeType = safeGet<string>(segment, 17, `${path}.planeType`) ?? "";
  const departureDate = safeGet(segment, 20, `${path}.departureDate`);
  const arrivalDate = safeGet(segment, 21, `${path}.arrivalDate`);
  const identity = safeGet<unknown[]>(segment, 22, `${path}.identity`);
  const airlineCode = typeof identity?.[0] === "string" && /^[A-Z0-9]{2}$/.test(identity[0]) ? identity[0] : undefined;
  const number = typeof identity?.[1] === "string" && /^\d+[A-Z]?$/.test(identity[1]) ? identity[1] : undefined;

  return {
    airline: typeof identity?.[3] === "string" ? identity[3] : "",
    airlineCode,
    flightNumber: airlineCode && number ? airlineCode + number : undefined,
    fromAirport: { code: fromCode, name: fromName },
    toAirport: { code: toCode, name: toName },
    departure: {
      date: formatDate(departureDate),
      time: formatTime(departureTime),
    },
    arrival: {
      date: formatDate(arrivalDate),
      time: formatTime(arrivalTime),
    },
    durationMinutes: duration,
    planeType,
  };
}

/**
 * Parse the full payload into structured flight results.
 */
function parsePayload(payload: unknown[]): FlightResult[] {
  if (payload.length < 4) {
    throw new ParseError("Google Flights response structure changed at payload — missing flight groups");
  }
  const results: FlightResult[] = [];
  let firstError: ParseError | undefined;

  // payload[2] 與 payload[3] 分別包含最佳航班及其他航班。
  for (const groupIndex of [2, 3]) {
    const groupPath = `payload[${groupIndex}]`;
    const group = payload[groupIndex];
    if (group === null) continue;
    const container = requireArray(group, groupPath);
    const entries = requireArray(container[0], `${groupPath}[0]`);

    for (let i = 0; i < entries.length; i++) {
      const path = `${groupPath}[0][${i}]`;
      try {
        const entry = requireArray(entries[i], path);
        const flight = requireArray(entry[0], `${path}[0]`);
        const priceInfo = requireArray(entry[1], `${path}[1]`);
        const priceInner = requireArray(priceInfo[0], `${path}[1][0]`);
        const airlines = z.array(z.string()).min(1).parse(flight[1]);
        const segmentsArr = requireArray(flight[2], `${path}[0][2]`);
        const segments = segmentsArr.map((raw, index) => {
          const segmentPath = `${path}[0][2][${index}]`;
          const segment = parseSegment(requireArray(raw, segmentPath), segmentPath);
          if (!segment.airline) segment.airline = airlines[index % airlines.length];
          return segment;
        });
        const extras = safeGet<unknown[]>(flight, 22, path);
        const emission = safeGet<number>(extras, 7, path);
        const typical = safeGet<number>(extras, 8, path);
        const carbonEmission = typeof emission === "number" && typeof typical === "number"
          ? { grams: emission, typicalGrams: typical }
          : undefined;
        results.push(flightSchema.parse({
          type: flight[0],
          airlines,
          price: { amount: priceInner[1], currency: "" },
          durationMinutes: flight[9],
          stops: Math.max(0, segments.length - 1),
          segments,
          carbonEmission,
        }));
      } catch (error) {
        const detail = error instanceof z.ZodError
          ? error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ")
          : error instanceof Error ? error.message : String(error);
        const failure = new ParseError(`Google Flights response structure changed at ${path} — ${detail}`);
        firstError ??= failure;
        process.stderr.write(`  Warning: skipped ${path}: ${detail}\n`);
      }
    }
  }
  if (results.length === 0 && firstError) throw firstError;
  return results;
}

/**
 * Parse airlines metadata from the payload.
 */
function parseAirlinesMeta(
  payload: unknown[],
): Array<{ code: string; name: string }> {
  try {
    const meta = safeGet<unknown[]>(payload, 7, "payload[7]");
    if (!meta) return [];
    const inner = safeGet<unknown[]>(meta, 1, "payload[7][1]");
    if (!inner) return [];
    const airlinesArr = safeGet<unknown[][]>(inner, 1, "payload[7][1][1]");
    if (!airlinesArr) return [];

    return airlinesArr.filter(Array.isArray).map((entry) => ({
      code: String(entry[0] ?? ""),
      name: String(entry[1] ?? ""),
    }));
  } catch {
    return [];
  }
}

/**
 * Main parse entry point. Takes raw HTML, returns structured search response.
 */
export function parseFlightsHtml(
  html: string,
  query: { from: string; to: string; date: string; returnDate?: string },
  currency: string,
): SearchResponse {
  let payload: unknown[];
  let flights: FlightResult[];

  try {
    payload = requireArray(extractJsonFromHtml(html), "payload");
    flights = parsePayload(payload);
  } catch (error) {
    const debugPath = saveDebugHtml(html);
    if (error instanceof ParseError) {
      error.debugHtmlPath = debugPath;
    }
    process.stderr.write(`  Debug HTML saved to: ${debugPath}\n`);
    throw error;
  }

  // Set currency on all flights
  for (const flight of flights) {
    flight.price.currency = currency;
    // 尚未驗證供應商的行李費用欄位；未知不等於免費或已含。
    flight.baggage = { status: "unknown" };
  }

  const airlinesMeta = parseAirlinesMeta(payload);

  return {
    query: {
      from: query.from,
      to: query.to,
      date: query.date,
      ...(query.returnDate ? { returnDate: query.returnDate } : {}),
    },
    flights,
    metadata: {
      fetchedAt: new Date().toISOString(),
      source: "google-flights",
      airlines: airlinesMeta.length > 0 ? airlinesMeta : undefined,
    },
  };
}
