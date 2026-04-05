# AnimeKai Vercel TypeScript API

Vercel-deployed TypeScript port of the AnimeKai scraper API.

It exposes catalog discovery, anime metadata, episode listing, stream resolution, and generated OpenAPI docs through a single Vercel Function routed from `api/router.ts`.

## Live Service

- Base URL: `https://anime-kai-api-js.vercel.app`
- Swagger UI: `https://anime-kai-api-js.vercel.app/docs`
- ReDoc: `https://anime-kai-api-js.vercel.app/redoc`
- OpenAPI JSON: `https://anime-kai-api-js.vercel.app/openapi.json`
- Health check: `https://anime-kai-api-js.vercel.app/health`

## What It Includes

- Vercel Function API with clean rewrites
- Swagger UI and ReDoc powered by generated OpenAPI
- Search, filters, details, episodes, and stream resolution endpoints
- Configurable upstream AnimeKai mirror and scraping defaults
- TypeScript implementation using `fetch` and `cheerio`

## Endpoints

### Meta

`GET /`

Returns basic service metadata and docs links.

`GET /health`

Returns service status and the upstream AnimeKai base URL currently in use.

### Documentation

`GET /docs`

Interactive Swagger UI.

`GET /redoc`

ReDoc view of the same OpenAPI schema.

`GET /openapi.json`

Raw OpenAPI 3.1 document.

### Catalog

`GET /filters`

Returns valid filter values for:

- `sort`
- `genres`
- `statuses`
- `types`
- `seasons`
- `languages`
- `countries`
- `ratings`
- `years`

`GET /catalog/popular`

Query params:

- `page` default `1`
- `base_url` optional upstream override
- `include_adult` default from env
- `title_language` one of `en`, `romaji`

`GET /catalog/latest`

Query params:

- `page` default `1`
- `base_url` optional upstream override
- `include_adult` default from env
- `title_language` one of `en`, `romaji`

`GET /catalog/search`

Query params:

- `query` search text
- `page` default `1`
- `sort` one of `auto`, `most_relevance`, `updated_date`, `release_date`, `end_date`, `trending`, `title_az`, `avg_score`, `mal_score`, `total_views`, `total_bookmarks`, `total_episodes`
- repeated params: `genres`, `exclude_genres`, `statuses`, `types`, `seasons`, `languages`, `countries`, `ratings`, `years`
- `base_url` optional upstream override
- `include_adult` default from env
- `title_language` one of `en`, `romaji`

Repeated params are passed multiple times, for example:

```text
/catalog/search?query=bleach&genres=action&genres=super-power
```

### Anime

`GET /anime/details`

Required query params:

- `anime_path`

Optional query params:

- `base_url`
- `title_language` one of `en`, `romaji`

`GET /anime/episodes`

Required query params:

- `anime_path`

Optional query params:

- `base_url`

### Streaming

`GET /videos`

Required query params:

- `watch_path`
- `episode_token`

Optional query params:

- `base_url`
- repeated `enabled_types` values: `sub`, `dub`, `softsub`
- `preferred_quality` default from env or `1080`
- `preferred_type_label` default from env or `Subtitled`
- `preferred_server` default from env or `Server 1`

## Example Requests

```bash
curl "https://anime-kai-api-js.vercel.app/"
```

```bash
curl "https://anime-kai-api-js.vercel.app/filters"
```

```bash
curl "https://anime-kai-api-js.vercel.app/catalog/popular?page=1"
```

```bash
curl "https://anime-kai-api-js.vercel.app/catalog/search?query=one%20piece&sort=trending&genres=action"
```

```bash
curl "https://anime-kai-api-js.vercel.app/anime/details?anime_path=/watch/one-piece"
```

```bash
curl "https://anime-kai-api-js.vercel.app/anime/episodes?anime_path=/watch/one-piece"
```

```bash
curl "https://anime-kai-api-js.vercel.app/videos?watch_path=/watch/one-piece/episode-1&episode_token=YOUR_TOKEN"
```

## Response Shapes

Common top-level response objects include:

- service info with `name`, `version`, `docs_url`, `redoc_url`
- catalog/search results with `page`, `has_next_page`, `source_url`, `items`
- anime details with `title`, `alt_title`, `description`, `genres`, `status`
- episode lists with `number`, `title`, `token`, `watch_path`
- video results with `total`, `preferred_quality`, `preferred_type_label`, `preferred_server`, `items`

Use `/openapi.json`, `/docs`, or `/redoc` for the exact schemas.

## Error Behavior

Errors are returned as JSON:

```json
{
  "detail": "anime_path is required."
}
```

Typical status codes:

- `200` successful request
- `404` unknown route
- `422` invalid or missing input
- `502` upstream AnimeKai or network failure
- `500` unknown internal failure

## Local Development

From this repository root:

```bash
npm install
npm run typecheck
npm test
```

If you want a local Vercel-style runtime:

```bash
npx vercel dev
```

## Environment Variables

- `ANIMEKAI_BASE_URL`
- `ANIMEKAI_INCLUDE_ADULT`
- `ANIMEKAI_TITLE_LANGUAGE`
- `ANIMEKAI_ENABLED_TYPES`
- `ANIMEKAI_PREFERRED_QUALITY`
- `ANIMEKAI_PREFERRED_TYPE`
- `ANIMEKAI_PREFERRED_SERVER`
- `ANIMEKAI_USER_AGENT`
- `ANIMEKAI_TIMEOUT_SECONDS`

Defaults currently include:

- title language: `en`
- enabled types: `sub,dub,softsub`
- preferred quality: `1080`
- preferred type label: `Subtitled`
- preferred server: `Server 1`
- timeout: `20` seconds

## Deploy To Vercel

This repo deploys as Vercel Functions from `api/router.ts`.

Recommended project settings:

- Root Directory: `.`
- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: leave empty

Deploy commands:

```bash
vercel
```

```bash
vercel --prod
```
