#!/usr/bin/env node

import { Command } from "commander";
import { SearchInputSchema, CheapestInputSchema, MultiCityInputSchema } from "./types.js";
import { searchCommand, multiCityCommand } from "./commands/search.js";
import { cheapestCommand } from "./commands/cheapest.js";
import { ZodError } from "zod";

const program = new Command();

program
  .name("flyfar")
  .description("Flight search CLI — fly far, pay less.")
  .version("1.0.0");

program
  .command("search")
  .description("Search flights for a route")
  .requiredOption("--from <code>", "Departure airport (IATA code)")
  .requiredOption("--to <code>", "Arrival airport (IATA code)")
  .requiredOption("--date <YYYY-MM-DD>", "Departure date")
  .option("--return <YYYY-MM-DD>", "Return date (makes it round-trip)")
  .option("--direct", "Direct flights only", false)
  .option(
    "--airline <codes>",
    "Filter by airline (comma-separated, e.g. EVA,CI,Peach)",
    (val: string) => val.split(",")
  )
  .option(
    "--seat <type>",
    "Seat class: economy, premium-economy, business, first",
    "economy"
  )
  .option("--passengers <n>", "Number of adult passengers", "1")
  .option("--json", "Output as JSON (for AI agents)", false)
  .option("--language <code>", "Language code", "en-US")
  .option("--currency <code>", "Currency code", "TWD")
  .option("--proxy <url>", "HTTP proxy URL")
  .action(async (opts) => {
    try {
      const input = SearchInputSchema.parse({
        ...opts,
        passengers: Number(opts.passengers),
      });
      await searchCommand(input);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("multi")
  .description("Search multi-city flights")
  .requiredOption(
    "--route <codes>",
    "Airport codes (comma-separated, e.g. TPE,NRT,KIX,TPE)",
    (val: string) => val.split(",").map((s: string) => s.trim().toUpperCase())
  )
  .requiredOption(
    "--dates <dates>",
    "Dates for each leg (comma-separated)",
    (val: string) => val.split(",").map((s: string) => s.trim())
  )
  .option("--seat <type>", "Seat class", "economy")
  .option("--passengers <n>", "Number of adult passengers", "1")
  .option("--json", "Output as JSON", false)
  .option("--language <code>", "Language code", "en-US")
  .option("--currency <code>", "Currency code", "TWD")
  .option("--proxy <url>", "HTTP proxy URL")
  .action(async (opts) => {
    try {
      const input = MultiCityInputSchema.parse({
        ...opts,
        passengers: Number(opts.passengers),
      });
      await multiCityCommand(input);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("cheapest")
  .description("Find cheapest dates in a range")
  .requiredOption("--from <code>", "Departure airport (IATA code)")
  .requiredOption("--to <code>", "Arrival airport (IATA code)")
  .requiredOption(
    "--range <start> <end>",
    "Date range (two dates)",
    (val: string, prev: string[]) => {
      if (!prev) return [val];
      return [...prev, val];
    }
  )
  .option("--stay <days>", "Stay duration in days (adds return leg)")
  .option("--json", "Output as JSON", false)
  .option("--language <code>", "Language code", "en-US")
  .option("--currency <code>", "Currency code", "TWD")
  .option("--proxy <url>", "HTTP proxy URL")
  .action(async (opts) => {
    try {
      const range = opts.range as string[];
      if (!range || range.length < 2) {
        process.stderr.write("Error: --range needs two dates (start end)\n");
        process.exit(2);
      }
      const input = CheapestInputSchema.parse({
        ...opts,
        rangeStart: range[0],
        rangeEnd: range[1],
        stay: opts.stay ? Number(opts.stay) : undefined,
      });
      await cheapestCommand(input);
    } catch (error) {
      handleError(error);
    }
  });

function handleError(error: unknown): never {
  if (error instanceof ZodError) {
    process.stderr.write("Validation error:\n");
    for (const issue of error.issues) {
      process.stderr.write(`  ${issue.path.join(".")}: ${issue.message}\n`);
    }
    process.exit(2);
  }

  if (error instanceof Error) {
    process.stderr.write(`Error: ${error.message}\n`);
    if (process.env.DEBUG) {
      process.stderr.write(error.stack ?? "");
      process.stderr.write("\n");
    }
  } else {
    process.stderr.write(`Error: ${String(error)}\n`);
  }
  process.exit(2);
}

program.parse();
