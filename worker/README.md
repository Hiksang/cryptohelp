# buidlTown Worker

Data scraping worker for buidlTown. Scrapes hackathons and grants from various sources.

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```

2. Install dependencies:
```bash
pnpm install
```

3. Install Playwright browsers:
```bash
pnpm exec playwright install chromium
```

## Running Locally

### Run all scrapers once:
```bash
pnpm scrape:all
```

### Run individual scrapers:
```bash
pnpm scrape:ethglobal
pnpm scrape:devfolio
pnpm scrape:grants
```

### Run as daemon (with scheduler):
```bash
pnpm dev
```

## Docker

### Build and run:
```bash
docker-compose up -d --build
```

### View logs:
```bash
docker-compose logs -f worker
```

### Stop:
```bash
docker-compose down
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Required |
| `SCRAPE_SCHEDULE` | Cron schedule for scraping | `0 0 * * *` (daily at midnight) |
