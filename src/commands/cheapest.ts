import type { CheapestInput, CheapestResponse } from "../types.js";
import { buildTfsParam, type QueryParams } from "../core/query.js";
import { fetchFlightsHtml } from "../core/fetch.js";
import { parseFlightsHtml } from "../core/parse.js";
import { formatJson } from "../output/json.js";
import { formatCheapestTable } from "../output/table.js";

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00Z");
  const endDate = new Date(end + "T00:00:00Z");

  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]!);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0]!;
}

async function fetchCheapestDate(
  date: string,
  input: CheapestInput,
  trip: "one-way" | "round-trip",
): Promise<CheapestResponse["dates"][0]> {
  const legs = [{ date, from: input.from, to: input.to }];

  if (input.stay) {
    legs.push({
      date: addDays(date, input.stay),
      from: input.to,
      to: input.from,
    });
  }

  const queryParams: QueryParams = {
    legs,
    seat: "economy",
    trip,
    passengers: 1,
    language: input.language,
    currency: input.currency,
  };

  try {
    const tfs = await buildTfsParam(queryParams);
    const html = await fetchFlightsHtml({
      tfs,
      language: input.language,
      currency: input.currency,
      proxy: input.proxy,
    });

    const response = parseFlightsHtml(
      html,
      { from: input.from, to: input.to, date },
      input.currency,
    );

    const prices = response.flights
      .map((f) => f.price.amount)
      .filter((p) => p > 0);

    return {
      date,
      cheapestPrice: prices.length > 0 ? Math.min(...prices) : 0,
      currency: input.currency,
      flightCount: response.flights.length,
    };
  } catch (error) {
    throw new Error(`[${date}] ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function cheapestCommand(input: CheapestInput): Promise<void> {
  const dates = dateRange(input.rangeStart, input.rangeEnd);

  if (dates.length === 0) {
    process.stderr.write("Error: empty date range\n");
    process.exit(2);
  }

  if (dates.length > 30) {
    process.stderr.write(
      `Warning: scanning ${dates.length} dates — this will make ${dates.length} requests with concurrency ${input.concurrency}\n`,
    );
  }

  const trip = input.stay ? "round-trip" : "one-way";

  process.stderr.write(
    `Scanning cheapest: ${input.from} → ${input.to} (${dates.length} dates, concurrency=${input.concurrency})...\n`,
  );

  const results = await runWithConcurrency(
    dates,
    input.concurrency,
    async (date) => {
      process.stderr.write(`  [${date}] fetching...\n`);
      const result = await fetchCheapestDate(date, input, trip);
      process.stderr.write(
        `  [${date}] ${result.cheapestPrice > 0 ? `$${result.cheapestPrice}` : "no prices"} (${result.flightCount} flights)\n`,
      );
      return result;
    },
  );

  const cheapestResponse: CheapestResponse = {
    query: {
      from: input.from,
      to: input.to,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      stay: input.stay,
    },
    dates: results,
    metadata: {
      fetchedAt: new Date().toISOString(),
      source: "google-flights",
    },
  };

  if (input.json) {
    process.stdout.write(formatJson(cheapestResponse) + "\n");
  } else {
    process.stdout.write(formatCheapestTable(cheapestResponse) + "\n");
  }

  if (results.every((result) => result.flightCount === 0)) {
    process.exitCode = 1;
  }
}
