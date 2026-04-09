import type { CheapestInput, CheapestResponse, SearchResponse } from "../types.js";
import { buildTfsParam, type QueryParams } from "../core/query.js";
import { fetchFlightsHtml } from "../core/fetch.js";
import { parseFlightsHtml } from "../core/parse.js";
import { formatJson } from "../output/json.js";
import { formatCheapestTable } from "../output/table.js";

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]!);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

export async function cheapestCommand(input: CheapestInput): Promise<void> {
  const dates = dateRange(input.rangeStart, input.rangeEnd);

  if (dates.length === 0) {
    process.stderr.write("Error: empty date range\n");
    process.exit(2);
  }

  if (dates.length > 30) {
    process.stderr.write(
      `Warning: scanning ${dates.length} dates — this will make ${dates.length} requests and may take a while\n`
    );
  }

  process.stderr.write(
    `Scanning cheapest: ${input.from} → ${input.to} (${dates.length} dates)...\n`
  );

  const results: CheapestResponse["dates"] = [];

  for (const date of dates) {
    const trip = input.stay ? "round-trip" : "one-way";
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
      trip: trip as "one-way" | "round-trip",
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
        input.currency
      );

      const prices = response.flights
        .map((f) => f.price.amount)
        .filter((p) => p > 0);

      results.push({
        date,
        cheapestPrice: prices.length > 0 ? Math.min(...prices) : 0,
        currency: input.currency,
        flightCount: response.flights.length,
      });

      process.stderr.write(
        `  ${date}: ${prices.length > 0 ? `$${Math.min(...prices)}` : "no prices"} (${response.flights.length} flights)\n`
      );
    } catch (error) {
      process.stderr.write(
        `  ${date}: error — ${error instanceof Error ? error.message : String(error)}\n`
      );
      results.push({
        date,
        cheapestPrice: 0,
        currency: input.currency,
        flightCount: 0,
      });
    }
  }

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
}
