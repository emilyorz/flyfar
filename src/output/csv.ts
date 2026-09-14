import type { SearchResponse, FlightResult } from "../types.js";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function flightToCsvRow(flight: FlightResult, idx: number, legLabel = ""): string {
  const seg = flight.segments[0];
  const lastSeg = flight.segments[flight.segments.length - 1];
  const fields = [
    String(idx + 1),
    legLabel,
    flight.airlines.join("; "),
    flight.type,
    seg ? seg.departure.time : "",
    seg ? `${seg.fromAirport.code} ${seg.fromAirport.name}` : "",
    lastSeg ? lastSeg.arrival.time : "",
    lastSeg ? `${lastSeg.toAirport.code} ${lastSeg.toAirport.name}` : "",
    String(flight.durationMinutes),
    formatDuration(flight.durationMinutes),
    String(flight.stops),
    String(flight.price.amount),
    flight.price.currency,
    flight.segments.map((s) => s.planeType).filter(Boolean).join("; "),
    flight.priceScope ?? "",
    flight.baggage?.status ?? "unknown",
    flight.deepLink ?? "",
    JSON.stringify(flight.segments),
    JSON.stringify(flight.returnOptions ?? []),
  ];
  return fields.map(escapeCsvField).join(",");
}

export function formatSearchCsv(response: SearchResponse): string {
  const { query, flights } = response;
  const lines: string[] = [];

  lines.push("# search," + escapeCsvField(JSON.stringify(query)));

  const header = [
    "num",
    "leg",
    "airlines",
    "flight_number",
    "departure_time",
    "departure_airport",
    "arrival_time",
    "arrival_airport",
    "duration_min",
    "duration_str",
    "stops",
    "price_amount",
    "price_currency",
    "plane_types",
    "price_scope",
    "baggage_status",
    "deep_link",
    "segments",
    "return_options",
  ].join(",");

  lines.push(header);

  flights.forEach((flight, i) => {
    lines.push(flightToCsvRow(flight, i, query.returnDate ? "Leg 1" : ""));
  });

  return lines.join("\n");
}
