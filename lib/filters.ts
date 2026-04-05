import type { SortOption } from "./constants";

export type FilterOption = {
  id: string;
  label: string;
};

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/[\/_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliases(option: FilterOption): string[] {
  return [option.id.toLowerCase(), slug(option.label), slug(option.id)];
}

export const GENRES: FilterOption[] = [
  { id: "47", label: "Action" },
  { id: "1", label: "Adventure" },
  { id: "235", label: "Avant Garde" },
  { id: "184", label: "Boys Love" },
  { id: "7", label: "Comedy" },
  { id: "127", label: "Demons" },
  { id: "66", label: "Drama" },
  { id: "8", label: "Ecchi" },
  { id: "34", label: "Fantasy" },
  { id: "926", label: "Girls Love" },
  { id: "436", label: "Gourmet" },
  { id: "196", label: "Harem" },
  { id: "421", label: "Horror" },
  { id: "77", label: "Isekai" },
  { id: "225", label: "Iyashikei" },
  { id: "555", label: "Josei" },
  { id: "35", label: "Kids" },
  { id: "78", label: "Magic" },
  { id: "857", label: "Mahou Shoujo" },
  { id: "92", label: "Martial Arts" },
  { id: "219", label: "Mecha" },
  { id: "134", label: "Military" },
  { id: "27", label: "Music" },
  { id: "48", label: "Mystery" },
  { id: "356", label: "Parody" },
  { id: "240", label: "Psychological" },
  { id: "798", label: "Reverse Harem" },
  { id: "145", label: "Romance" },
  { id: "9", label: "School" },
  { id: "36", label: "Sci-Fi" },
  { id: "189", label: "Seinen" },
  { id: "183", label: "Shoujo" },
  { id: "37", label: "Shounen" },
  { id: "125", label: "Slice of Life" },
  { id: "220", label: "Space" },
  { id: "10", label: "Sports" },
  { id: "350", label: "Super Power" },
  { id: "49", label: "Supernatural" },
  { id: "322", label: "Suspense" },
  { id: "241", label: "Thriller" },
  { id: "126", label: "Vampire" },
];

export const STATUS_OPTIONS: FilterOption[] = [
  { id: "info", label: "Not Aired Yet" },
  { id: "releasing", label: "Releasing" },
  { id: "completed", label: "Completed" },
];

export const TYPE_OPTIONS: FilterOption[] = [
  { id: "movie", label: "Movie" },
  { id: "tv", label: "TV" },
  { id: "ova", label: "OVA" },
  { id: "ona", label: "ONA" },
  { id: "special", label: "Special" },
  { id: "music", label: "Music" },
];

export const SEASON_OPTIONS: FilterOption[] = [
  { id: "fall", label: "Fall" },
  { id: "summer", label: "Summer" },
  { id: "spring", label: "Spring" },
  { id: "winter", label: "Winter" },
  { id: "unknown", label: "Unknown" },
];

export const LANGUAGE_OPTIONS: FilterOption[] = [
  { id: "sub", label: "Hard Sub" },
  { id: "softsub", label: "Soft Sub" },
  { id: "dub", label: "Dub" },
  { id: "subdub", label: "Sub & Dub" },
];

export const COUNTRY_OPTIONS: FilterOption[] = [
  { id: "11", label: "Japan" },
  { id: "2", label: "China" },
];

export const RATING_OPTIONS: FilterOption[] = [
  { id: "g", label: "G - All Ages" },
  { id: "pg", label: "PG - Children" },
  { id: "pg_13", label: "PG 13 - Teens 13 or older" },
  { id: "r", label: "R-17+, Violence & Profanity" },
  { id: "r%2B", label: "R+ - Profanity & Mild Nudity" },
  { id: "rx", label: "Rx - Hentai" },
];

export type SearchAppliedFilters = {
  sort: SortOption;
  genres: string[];
  exclude_genres: string[];
  statuses: string[];
  types: string[];
  seasons: string[];
  languages: string[];
  countries: string[];
  ratings: string[];
  years: string[];
};

export function resolveFilterValues(values: string[], options: FilterOption[], category: string): string[] {
  if (values.length === 0) {
    return [];
  }

  const lookup = new Map<string, string>();
  for (const option of options) {
    for (const alias of aliases(option)) {
      lookup.set(alias, option.id);
    }
  }

  const optionIds = new Set(options.map((option) => option.id));
  const resolved: string[] = [];
  for (const value of values) {
    const candidate = lookup.get(slug(value)) ?? lookup.get(value.toLowerCase()) ?? value;
    if (!resolved.includes(candidate)) {
      resolved.push(candidate);
    }
  }

  const invalid = resolved.filter((value) => !optionIds.has(value));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid ${category} value(s): ${invalid.join(", ")}. Use the ids or labels from /filters.`,
    );
  }

  return resolved;
}

export function currentYears(): string[] {
  const years: string[] = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= 2000; year -= 1) {
    years.push(String(year));
  }
  for (let decade = 1990; decade >= 1900; decade -= 10) {
    years.push(`${decade}s`);
  }
  return years;
}
