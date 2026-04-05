# AnimeKai Vercel TypeScript API

Vercel-ready TypeScript port of the AnimeKai scraper API.

## What It Includes

- same public endpoint surface as the FastAPI version
- Vercel rewrites so the URLs stay clean:
  - `/`
  - `/health`
  - `/filters`
  - `/catalog/search`
  - `/anime/details`
  - `/anime/episodes`
  - `/videos`
  - `/docs`
  - `/redoc`
  - `/openapi.json`
- Swagger UI and ReDoc
- TypeScript scraper logic using `fetch` + `cheerio`

## Local Setup

```bash
cd vercel-ts-api
npm install
npm run typecheck
npm test
```

## Deploy To Vercel

From this folder:

```bash
vercel
```

Production deploy:

```bash
vercel --prod
```

If you deploy from the repo root in the Vercel dashboard, set the project root directory to `vercel-ts-api`.

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

These match the Python version.
