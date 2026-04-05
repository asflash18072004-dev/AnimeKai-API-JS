export const BASE_URLS = [
  "https://anikai.to",
  "https://animekai.to",
  "https://animekai.fi",
  "https://animekai.fo",
  "https://animekai.gs",
  "https://animekai.la",
  "https://animekai.bz",
] as const;

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

export const ENCODE_KAI_URL = "https://enc-dec.app/api/enc-kai?text=";
export const DECODE_KAI_URL = "https://enc-dec.app/api/dec-kai?text=";
export const DECODE_MEGA_URL = "https://enc-dec.app/api/dec-mega";

export const SORT_OPTIONS = [
  "auto",
  "most_relevance",
  "updated_date",
  "release_date",
  "end_date",
  "trending",
  "title_az",
  "avg_score",
  "mal_score",
  "total_views",
  "total_bookmarks",
  "total_episodes",
] as const;

export const VIDEO_TYPES = ["sub", "dub", "softsub"] as const;
export const TITLE_LANGUAGES = ["en", "romaji"] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];
export type VideoType = (typeof VIDEO_TYPES)[number];
export type TitleLanguage = (typeof TITLE_LANGUAGES)[number];
