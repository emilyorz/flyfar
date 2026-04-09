import type { FlightResult, FlightSegment, SearchResponse } from "../types.js";
import { saveDebugHtml } from "./fetch.js";

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

function requireGet<T>(arr: unknown, index: number, path: string): T {
  const val = safeGet<T>(arr, index, path);
  if (val === undefined || val === null) {
    throw new ParseError(
      `Google Flights response structure changed at ${path}[${index}] — expected data but got ${val}`
    );
  }
  return val;
}

export class ParseError extends Error {
  constructor(
    message: string,
    public debugHtmlPath?: string
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
      "Could not find script.ds:1 in HTML — Google may have changed their page structure"
    );
  }

  const scriptContent = match[1];

  // The script contains: ...data:JSONDATA,...
  // We need to extract the JSON data after "data:"
  const dataIdx = scriptContent.indexOf("data:");
  if (dataIdx === -1) {
    throw new ParseError(
      'Could not find "data:" marker in script.ds:1 content'
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
      `Failed to parse JSON from script.ds:1 (length: ${jsonStr.length})`
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
  if (!Array.isArray(timeTuple) || timeTuple.length < 2) {
    return "unknown";
  }
  const [hour, minute] = timeTuple;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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

  return {
    airline: "", // filled by caller from flight-level data
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
  const flightsList = safeGet<unknown[] | null>(payload, 3, "payload");
  if (!flightsList) return [];

  const flightsArr = safeGet<unknown[]>(flightsList, 0, "payload[3]");
  if (!flightsArr) return [];

  const results: FlightResult[] = [];

  for (let i = 0; i < flightsArr.length; i++) {
    try {
      const entry = flightsArr[i] as unknown[];
      if (!Array.isArray(entry)) continue;

      const flight = safeGet<unknown[]>(entry, 0, `flights[${i}]`);
      const priceInfo = safeGet<unknown[]>(entry, 1, `flights[${i}].priceInfo`);

      if (!flight || !priceInfo) continue;

      // Price: entry[1][0][1]
      const priceInner = safeGet<unknown[]>(priceInfo, 0, `flights[${i}].price`);
      const price = priceInner
        ? (safeGet<number>(priceInner, 1, `flights[${i}].price.amount`) ?? 0)
        : 0;

      const type = safeGet<string>(flight, 0, `flights[${i}].type`) ?? "";
      const airlines =
        (safeGet<string[]>(flight, 1, `flights[${i}].airlines`) as string[]) ?? [];
      const segmentsArr =
        (safeGet<unknown[][]>(flight, 2, `flights[${i}].segments`) as unknown[][]) ?? [];

      const segments: FlightSegment[] = [];
      let totalDuration = 0;

      for (let j = 0; j < segmentsArr.length; j++) {
        const seg = parseSegment(
          segmentsArr[j] as unknown[],
          `flights[${i}].segments[${j}]`
        );
        // Assign airline from flight-level airlines list
        if (airlines.length > 0) {
          seg.airline = airlines[j % airlines.length] ?? airlines[0] ?? "";
        }
        segments.push(seg);
        totalDuration += seg.durationMinutes;
      }

      // Carbon emissions from extras
      let carbonEmission: FlightResult["carbonEmission"];
      const extras = safeGet<unknown[]>(flight, 22, `flights[${i}].extras`);
      if (extras) {
        const emission = safeGet<number>(extras, 7, `flights[${i}].extras.carbon`);
        const typical = safeGet<number>(extras, 8, `flights[${i}].extras.typicalCarbon`);
        if (emission !== undefined && typical !== undefined) {
          carbonEmission = { grams: emission, typicalGrams: typical };
        }
      }

      results.push({
        type,
        airlines,
        price: { amount: price, currency: "" }, // currency set by caller
        durationMinutes: totalDuration,
        stops: Math.max(0, segments.length - 1),
        segments,
        carbonEmission,
      });
    } catch (error) {
      // Skip individual flight parse errors, keep going
      process.stderr.write(
        `  Warning: skipped flight[${i}]: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  return results;
}

/**
 * Parse airlines metadata from the payload.
 */
function parseAirlinesMeta(
  payload: unknown[]
): Array<{ code: string; name: string }> {
  try {
    const meta = safeGet<unknown[]>(payload, 7, "payload[7]");
    if (!meta) return [];
    const inner = safeGet<unknown[]>(meta, 1, "payload[7][1]");
    if (!inner) return [];
    const airlinesArr = safeGet<unknown[][]>(inner, 1, "payload[7][1][1]");
    if (!airlinesArr) return [];

    return airlinesArr
      .filter(Array.isArray)
      .map((entry) => ({
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
  currency: string
): SearchResponse {
  let payload: unknown[];

  try {
    payload = extractJsonFromHtml(html) as unknown[];
  } catch (error) {
    const debugPath = saveDebugHtml(html);
    if (error instanceof ParseError) {
      error.debugHtmlPath = debugPath;
    }
    process.stderr.write(`  Debug HTML saved to: ${debugPath}\n`);
    throw error;
  }

  if (!Array.isArray(payload)) {
    const debugPath = saveDebugHtml(html);
    throw new ParseError(
      `Expected payload to be an array, got ${typeof payload}`,
      debugPath
    );
  }

  const flights = parsePayload(payload);
  // Set currency on all flights
  for (const flight of flights) {
    flight.price.currency = currency;
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
