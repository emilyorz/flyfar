import type { SearchInput, MultiCityInput } from "../types.js";
import { resolveAirline } from "../types.js";
import { buildTfsParam, type FlightLeg, type QueryParams } from "../core/query.js";
import { fetchFlightsHtml } from "../core/fetch.js";
import { parseFlightsHtml, ParseError } from "../core/parse.js";
import { formatJson } from "../output/json.js";
import { formatSearchTable } from "../output/table.js";
import type { TripType } from "../types.js";

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
    `Searching ${input.from} → ${input.to} on ${input.date}${input.return ? ` (return ${input.return})` : ""}...\n`
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
    input.currency
  );

  if (input.json) {
    process.stdout.write(formatJson(response) + "\n");
  } else {
    process.stdout.write(formatSearchTable(response) + "\n");
  }

  // Exit code: 0 = flights found, 1 = no flights
  if (response.flights.length === 0) {
    process.exit(1);
  }
}

export async function multiCityCommand(input: MultiCityInput): Promise<void> {
  if (input.route.length < 2) {
    process.stderr.write("Error: multi-city route needs at least 2 airports\n");
    process.exit(2);
  }

  if (input.dates.length !== input.route.length - 1) {
    process.stderr.write(
      `Error: need ${input.route.length - 1} dates for ${input.route.length} airports, got ${input.dates.length}\n`
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

  const legDescriptions = legs
    .map((l) => `${l.from}→${l.to}`)
    .join(", ");
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
    input.currency
  );

  if (input.json) {
    process.stdout.write(formatJson(response) + "\n");
  } else {
    process.stdout.write(formatSearchTable(response) + "\n");
  }

  if (response.flights.length === 0) {
    process.exit(1);
  }
}
