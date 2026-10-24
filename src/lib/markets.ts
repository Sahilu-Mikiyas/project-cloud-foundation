export const MARKET_REGIONS = [
  { value: "africa", label: "Africa" },
  { value: "asia", label: "Asia" },
  { value: "europe", label: "Europe" },
  { value: "middle_east", label: "Middle East" },
  { value: "north_america", label: "North America" },
  { value: "central_america_caribbean", label: "Central America & Caribbean" },
  { value: "south_america", label: "South America" },
  { value: "oceania", label: "Oceania" },
] as const;

export type MarketRegion = (typeof MARKET_REGIONS)[number]["value"];

export function marketRegionLabel(value: string) {
  return MARKET_REGIONS.find((region) => region.value === value)?.label ?? value;
}

export function marketLocation(marketCity: string | null, marketCountry: string) {
  return [marketCity, marketCountry].filter(Boolean).join(", ");
}
