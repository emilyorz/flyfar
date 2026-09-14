import chalk from "chalk";
import Table from "cli-table3";
import type { SearchResponse, FlightResult, CheapestResponse } from "../types.js";

export type SortKey = "price" | "duration" | "departure" | "stops";

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
      chalk.bold("Leg"),
      chalk.bold("Airlines"),
      chalk.bold("Depart"),
      chalk.bold("Arrive"),
      chalk.bold("Duration"),
      chalk.bold("Stops"),
      chalk.bold("Price"),
    ],
    style: { head: [], border: ["gray"] },
    colWidths: [8, 18, 14, 14, 12, 10, 14],
  });

  for (const flight of flights) {
    const firstSeg = flight.segments[0];
    const lastSeg = flight.segments[flight.segments.length - 1];

    if (!firstSeg || !lastSeg) continue;

    const legLabel = query.returnDate ? "Leg 1" : "";

    table.push([
      legLabel,
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
  lines.push("  行李：未知；未確認是否已含、件數或費用，以上不是已驗證的含行李總價。");
  if (query.returnDate) {
    lines.push("  上表為去程候選的來回起價；下列回程價格為該去程搭配回程的整組總價，請勿相加。");
  }
  flights.forEach((flight, index) => {
    lines.push(`\n  候選 ${index + 1}${query.returnDate ? " 去程" : ""}`);
    for (const segment of flight.segments) {
      lines.push(`    ${segment.flightNumber ?? "班號未知"} ${segment.airline} ${segment.fromAirport.code} ${segment.departure.date} ${segment.departure.time} → ${segment.toAirport.code} ${segment.arrival.date} ${segment.arrival.time}`);
    }
    flight.returnOptions?.forEach((option, returnIndex) => {
      lines.push(`  候選 ${index + 1} 回程 ${returnIndex + 1} — 來回總價 ${option.price.amount.toLocaleString()} ${option.price.currency}；行李：未知`);
      for (const segment of option.segments) {
        lines.push(`    ${segment.flightNumber ?? "班號未知"} ${segment.airline} ${segment.fromAirport.code} ${segment.departure.date} ${segment.departure.time} → ${segment.toAirport.code} ${segment.arrival.date} ${segment.arrival.time}`);
      }
    });
    if (flight.returnOptions?.length === 0) lines.push("    無可用回程組合。");
    if (flight.deepLink) lines.push(`    選擇完整組合：${flight.deepLink}`);
  });

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

export function sortFlights(flights: FlightResult[], key: SortKey): FlightResult[] {
  return [...flights].sort((a, b) => {
    switch (key) {
      case "price":
        return a.price.amount - b.price.amount;
      case "duration":
        return a.durationMinutes - b.durationMinutes;
      case "departure": {
        const aTime = a.segments[0]?.departure.time ?? "";
        const bTime = b.segments[0]?.departure.time ?? "";
        return aTime.localeCompare(bTime);
      }
      case "stops":
        return a.stops - b.stops;
      default:
        return 0;
    }
  });
}

export function formatRecommendTable(flight: FlightResult, score: number): string {
  const firstSeg = flight.segments[0];
  const lastSeg = flight.segments[flight.segments.length - 1];
  const stopsStr = flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`;
  return `  ★ Best: ${flight.airlines.join(", ")} $${flight.price.amount.toLocaleString()} — ${firstSeg?.departure.time}→${lastSeg?.arrival.time} ${stopsStr} (score: ${score.toFixed(2)})`;
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
  lines.push("  行李：未知；價格未確認包含行李費用。");
  if (query.stay) lines.push("  價格為來回起價；透過各日期連結選擇完整去回程組合。");
  for (const entry of dates) {
    if (entry.deepLink) lines.push(`  ${entry.date}${entry.returnDate ? ` → ${entry.returnDate}` : ""}：${entry.deepLink}`);
  }
  lines.push("");

  return lines.join("\n");
}
