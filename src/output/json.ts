import type { SearchResponse, CheapestResponse } from "../types.js";

export function formatJson(data: SearchResponse | CheapestResponse): string {
  return JSON.stringify(data, null, 2);
}
