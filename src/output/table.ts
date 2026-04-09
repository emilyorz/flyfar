import chalk from "chalk";
import Table from "cli-table3";
import type { SearchResponse, FlightResult, CheapestResponse } from "../types.js";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function stopsLabel(stops: number): string {
  if (stops === 0) return chalk.green("Direct");
  if (stops === 1) return chalk.yellow("1 stop");
  return chalk.red(`${stops} stops`);
}

function priceColor(price: number, allPrices: number[]): string {
  const sorted = [...allPrices].sort((a, b) => a - b);
  const position = sorted.indexOf(price);
  const ratio = sorted.length > 1 ? position / (sorted.length - 1) : 0.5;

  if (ratio < 0.33) return chalk.green.bold(`$${price.toLocaleString()}`);
  if (ratio < 0.66) return chalk.white(`$${price.toLocaleString()}`);
  return chalk.red(`$${price.toLocaleString()}`);
}

export function formatSearchTable(response: SearchResponse): string {
  const { query, flights } = response;
  const lines: string[] = [];

  lines.push("");
  lines.push(
    chalk.bold.cyan(
      `  Flights: ${query.from} → ${query.to} on ${query.date}`
    )
  );
  if (query.returnDate) {
    lines.push(chalk.cyan(`  Return: ${query.returnDate}`));
  }
  lines.push("");

  if (flights.length === 0) {
    lines.push(chalk.yellow("  No flights found."));
    return lines.join("\n");
  }

  const allPrices = flights.map((f) => f.price.amount).filter((p) => p > 0);

  const table = new Table({
    head: [
      chalk.bold("Airlines"),
      chalk.bold("Depart"),
      chalk.bold("Arrive"),
      chalk.bold("Duration"),
      chalk.bold("Stops"),
      chalk.bold("Price"),
    ],
    style: { head: [], border: ["gray"] },
    colWidths: [18, 14, 14, 12, 10, 14],
  });

  for (const flight of flights) {
    const firstSeg = flight.segments[0];
    const lastSeg = flight.segments[flight.segments.length - 1];

    if (!firstSeg || !lastSeg) continue;

    table.push([
      flight.airlines.join(", ").substring(0, 16),
      `${firstSeg.departure.time}\n${firstSeg.fromAirport.code}`,
      `${lastSeg.arrival.time}\n${lastSeg.toAirport.code}`,
      formatDuration(flight.durationMinutes),
      stopsLabel(flight.stops),
      flight.price.amount > 0
        ? priceColor(flight.price.amount, allPrices)
        : chalk.gray("N/A"),
    ]);
  }

  lines.push(table.toString());

  // Summary
  const cheapest = flights
    .filter((f) => f.price.amount > 0)
    .sort((a, b) => a.price.amount - b.price.amount)[0];

  if (cheapest) {
    lines.push("");
    lines.push(
      chalk.green.bold(
        `  Cheapest: $${cheapest.price.amount.toLocaleString()} ${cheapest.price.currency} — ${cheapest.airlines.join(", ")}`
      )
    );
  }

  lines.push(chalk.gray(`  ${flights.length} flights found`));
  lines.push("");

  return lines.join("\n");
}

export function formatCheapestTable(response: CheapestResponse): string {
  const { query, dates } = response;
  const lines: string[] = [];

  lines.push("");
  lines.push(
    chalk.bold.cyan(
      `  Cheapest dates: ${query.from} → ${query.to} (${query.rangeStart} to ${query.rangeEnd})`
    )
  );
  if (query.stay) {
    lines.push(chalk.cyan(`  Stay: ${query.stay} days`));
  }
  lines.push("");

  if (dates.length === 0) {
    lines.push(chalk.yellow("  No price data found."));
    return lines.join("\n");
  }

  const allPrices = dates.map((d) => d.cheapestPrice).filter((p) => p > 0);

  const table = new Table({
    head: [
      chalk.bold("Date"),
      chalk.bold("Cheapest"),
      chalk.bold("Flights"),
    ],
    style: { head: [], border: ["gray"] },
  });

  for (const entry of dates) {
    table.push([
      entry.date,
      entry.cheapestPrice > 0
        ? priceColor(entry.cheapestPrice, allPrices)
        : chalk.gray("N/A"),
      String(entry.flightCount),
    ]);
  }

  lines.push(table.toString());
  lines.push("");

  return lines.join("\n");
}
