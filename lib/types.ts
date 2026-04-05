import type { SortOption, TitleLanguage, VideoType } from "./constants";

export type Settings = {
  appName: string;
  appVersion: string;
  baseUrl: string;
  includeAdult: boolean;
  titleLanguage: TitleLanguage;
  enabledTypes: Set<VideoType>;
  preferredQuality: string;
  preferredTypeLabel: string;
  preferredServer: string;
  userAgent: string;
  timeoutMs: number;
};

export type AnimeCard = {
  title: string;
  alt_title: string | null;
  path: string;
  thumbnail_url: string | null;
  adult: boolean;
};

export type AnimeListResponse = {
  page: number;
  has_next_page: boolean;
  source_url: string;
  items: AnimeCard[];
};

export type AnimeDetails = {
  path: string;
  title: string;
  alt_title: string | null;
  thumbnail_url: string | null;
  description: string | null;
  genres: string[];
  status: string | null;
  studios: string[];
  producers: string[];
};

export type Episode = {
  number: number;
  title: string | null;
  name: string;
  labels: string[];
  token: string;
  watch_path: string;
};

export type SubtitleTrack = {
  url: string;
  label: string;
};

export type VideoStream = {
  quality: string;
  url: string;
  headers: Record<string, string>;
  subtitles: SubtitleTrack[];
  source_type: string;
  source_type_label: string;
  server_name: string;
};

export type VideoListResponse = {
  total: number;
  preferred_quality: string;
  preferred_type_label: string;
  preferred_server: string;
  items: VideoStream[];
};

export type SearchResult = {
  page: number;
  has_next_page: boolean;
  source_url: string;
  applied_filters: {
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
  items: AnimeCard[];
};

export type FilterCatalog = {
  sort: string[];
  genres: { id: string; label: string }[];
  statuses: { id: string; label: string }[];
  types: { id: string; label: string }[];
  seasons: { id: string; label: string }[];
  languages: { id: string; label: string }[];
  countries: { id: string; label: string }[];
  ratings: { id: string; label: string }[];
  years: string[];
};

export type SearchFiltersInput = {
  sort: SortOption;
  genres: string[];
  excludeGenres: string[];
  statuses: string[];
  types: string[];
  seasons: string[];
  languages: string[];
  countries: string[];
  ratings: string[];
  years: string[];
};
