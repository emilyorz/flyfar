import type { SearchInput, MultiCityInput } from "../types.js";
import { resolveAirline } from "../types.js";
import {
  buildTfsParam,
  buildFlightsUrl,
  type FlightLeg,
  type QueryParams,
} from "../core/query.js";
import { fetchFlightsHtml } from "../core/fetch.js";
import { parseFlightsHtml } from "../core/parse.js";
import { formatJson } from "../output/json.js";
import {
  formatSearchTable,
  sortFlights,
  formatRecommendTable,
} from "../output/table.js";
import { formatSearchCsv } from "../output/csv.js";
import type { SortKey } from "../output/table.js";
import type { TripType } from "../types.js";
import { spawn } from "child_process";

export async function searchCommand(input: SearchInput): Promise<void> {
  const legs: FlightLeg[] = [];

  const resolvedAirlines = input.airline?.map(resolveAirline);

  // Outbound leg
  legs.push({
    date: input.date,
    from: input.from,
    to: input.to,
    maxStops: input.direct ? 0 : undefined,
    airlines: resolvedAirlines,
  });

  // Return leg (round trip)
  let trip: TripType = "one-way";
  if (input.return) {
    trip = "round-trip";
    legs.push({
      date: input.return,
      from: input.to,
      to: input.from,
      maxStops: input.direct ? 0 : undefined,
      airlines: resolvedAirlines,
    });
  }

  const queryParams: QueryParams = {
    legs,
    seat: input.seat,
    trip,
    passengers: input.passengers,
    language: input.language,
    currency: input.currency,
  };

  process.stderr.write(
    `Searching ${input.from} → ${input.to} on ${input.date}${input.return ? ` (return ${input.return})` : ""}...\n`,
  );

  const tfs = await buildTfsParam(queryParams);
  process.stderr.write(`  Query encoded (${tfs.length} chars)\n`);

  const html = await fetchFlightsHtml({
    tfs,
    language: input.language,
    currency: input.currency,
    proxy: input.proxy,
  });

  process.stderr.write(`  Response received (${html.length} bytes)\n`);

  const response = parseFlightsHtml(
    html,
    {
      from: input.from,
      to: input.to,
      date: input.date,
      returnDate: input.return,
    },
    input.currency,
  );

  const deepLink = buildFlightsUrl(tfs, input.language, input.currency);

  const sorted = sortFlights(response.flights, input.sort as SortKey);
  const sortedResponse = { ...response, flights: sorted, deepLink };
  for (const flight of sorted) {
    flight.priceScope = input.return ? "round-trip-from" : "one-way";
    flight.deepLink = deepLink;
  }

  if (input.return) {
    // 每個回程查詢綁定確切去程，不將兩次獨立單程報價拼成來回票。
    for (let start = 0; start < sorted.length; start += 5) {
      await Promise.all(sorted.slice(start, start + 5).map(async (outbound) => {
        const selectedFlights = outbound.segments.map((segment) => {
          if (!segment.airlineCode || !segment.flightNumber) {
            throw new Error("無可靠去程班號，無法查詢配對回程；請至 Google Flights 確認");
          }
          return {
            fromAirport: segment.fromAirport.code,
            date: segment.departure.date,
            toAirport: segment.toAirport.code,
            airline: segment.airlineCode,
            flightNumber: segment.flightNumber.slice(segment.airlineCode.length),
          };
        });
        const selectedTfs = await buildTfsParam({
          ...queryParams,
          legs: [{ ...legs[0], selectedFlights }, legs[1]],
        });
        outbound.deepLink = buildFlightsUrl(selectedTfs, input.language, input.currency);
        process.stderr.write(`  Returns for ${outbound.segments.map(s => s.flightNumber).join("+")}...\n`);
        const returnHtml = await fetchFlightsHtml({
          tfs: selectedTfs, language: input.language, currency: input.currency, proxy: input.proxy,
        });
        const returns = parseFlightsHtml(returnHtml, {
          from: input.to, to: input.from, date: input.return!,
        }, input.currency);
        for (const flight of returns.flights) {
          const first = flight.segments[0];
          const last = flight.segments[flight.segments.length - 1];
          if (first.fromAirport.code !== input.to || last.toAirport.code !== input.from ||
              first.departure.date !== input.return) {
            throw new Error("Google Flights 未返回配對回程，拒絕將去程當成回程");
          }
          flight.priceScope = "round-trip-total";
          flight.deepLink = outbound.deepLink;
        }
        outbound.returnOptions = sortFlights(returns.flights, input.sort as SortKey);
      }));
    }
  }

  if (input.json || input.output === "json") {
    process.stdout.write(formatJson(sortedResponse) + "\n");
  } else if (input.output === "csv") {
    process.stdout.write(formatSearchCsv(sortedResponse) + "\n");
  } else if (input.recommend && sorted.length > 0) {
    const n = sorted.length;
    // Normalize ranks (0-1, lower rank = better)
    const priceRank = sorted.map((f) => f.price.amount).filter((p) => p > 0);
    const durationRank = sorted.map((f) => f.durationMinutes);
    const stopsRank = sorted.map((f) => f.stops);

    const priceNorm = sorted.map((f, i) => {
      if (f.price.amount <= 0) return 1;
      const sortedP = [...priceRank].sort((a, b) => a - b);
      // Use findIndex on sorted to handle ties by giving the same score
      return (
        sortedP.findIndex((p) => p === f.price.amount) /
        (sortedP.length - 1 || 1)
      );
    });
    const durationNorm = sorted.map((f) => {
      const sortedD = [...durationRank].sort((a, b) => a - b);
      return sortedD.findIndex((d) => d === f.durationMinutes) / (n - 1 || 1);
    });
    const stopsNorm = sorted.map((f) => {
      const sortedS = [...stopsRank].sort((a, b) => a - b);
      return sortedS.findIndex((s) => s === f.stops) / (n - 1 || 1);
    });

    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      const score =
        priceNorm[i] * 0.4 + durationNorm[i] * 0.3 + stopsNorm[i] * 0.3;
      if (score < bestScore || bestScore < 0) {
        bestScore = score;
        bestIdx = i;
      }
    }
    // Tiebreaker: prefer earlier flight when scores are equal
    let tiedIdx = -1;
    for (let i = 0; i < n; i++) {
      const score =
        priceNorm[i] * 0.4 + durationNorm[i] * 0.3 + stopsNorm[i] * 0.3;
      if (Math.abs(score - bestScore) < 0.001 && i < bestIdx) {
        tiedIdx = i;
      }
    }
    if (tiedIdx >= 0) bestIdx = tiedIdx;
    process.stdout.write(formatSearchTable(sortedResponse) + "\n");
    process.stdout.write(
      formatRecommendTable(sorted[bestIdx], 1 - bestScore) + "\n",
    );
  } else {
    process.stdout.write(formatSearchTable(sortedResponse) + "\n");
  }

  // Open in browser if --open flag is set
  if (input.open && deepLink) {
    const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
    spawn(openCmd, [deepLink], { stdio: "ignore", detached: true });
  }

  // Exit code: 0 = flights found, 1 = no flights
  if (response.flights.length === 0 ||
      (input.return && response.flights.every(flight => flight.returnOptions?.length === 0))) {
    process.exitCode = 1;
  }
}

export async function multiCityCommand(input: MultiCityInput): Promise<void> {
  if (input.route.length < 2) {
    process.stderr.write("Error: multi-city route needs at least 2 airports\n");
    process.exit(2);
  }

  if (input.dates.length !== input.route.length - 1) {
    process.stderr.write(
      `Error: need ${input.route.length - 1} dates for ${input.route.length} airports, got ${input.dates.length}\n`,
    );
    process.exit(2);
  }

  const legs: FlightLeg[] = [];
  for (let i = 0; i < input.route.length - 1; i++) {
    legs.push({
      date: input.dates[i]!,
      from: input.route[i]!,
      to: input.route[i + 1]!,
    });
  }

  const queryParams: QueryParams = {
    legs,
    seat: input.seat,
    trip: "multi-city",
    passengers: input.passengers,
    language: input.language,
    currency: input.currency,
  };

  const legDescriptions = legs.map((l) => `${l.from}→${l.to}`).join(", ");
  process.stderr.write(`Searching multi-city: ${legDescriptions}...\n`);

  const tfs = await buildTfsParam(queryParams);
  const html = await fetchFlightsHtml({
    tfs,
    language: input.language,
    currency: input.currency,
    proxy: input.proxy,
  });

  const response = parseFlightsHtml(
    html,
    {
      from: input.route[0]!,
      to: input.route[input.route.length - 1]!,
      date: input.dates[0]!,
    },
    input.currency,
  );

  if (input.json) {
    process.stdout.write(formatJson(response) + "\n");
  } else {
    process.stdout.write(formatSearchTable(response) + "\n");
  }

  if (input.open) {
    const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
    spawn(openCmd, [buildFlightsUrl(tfs, input.language, input.currency)], { stdio: "ignore", detached: true });
  }

  if (response.flights.length === 0) {
    process.exitCode = 1;
  }
}
