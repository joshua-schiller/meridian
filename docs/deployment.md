# Meridian Deployment

The fastest hackathon deployment is:

- Vercel hosts `apps/web`.
- Render hosts `apps/api`.

Vercel Functions are not the right fit for the live voice path because Meridian uses a FastAPI WebSocket at `/voice/session`.

## Deploy the API on Render

1. Push a branch that includes `render.yaml`.
2. In Render, create a new Blueprint from this GitHub repository.
3. Select the `meridian-api` service from the blueprint.
4. Keep the free plan for demo use.
5. Add these environment variables in Render:

```text
ANTHROPIC_API_KEY=<your Anthropic key>
DEEPGRAM_API_KEY=<your Deepgram key>
REDIS_URL=<your Redis URL, optional but recommended for the sponsor path>
CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app
```

The blueprint already sets:

```text
PYTHON_VERSION=3.11.9
PYTHONPATH=packages/research_core
CLAUDE_MODEL=claude-sonnet-4-5
CLAUDE_TIMEOUT_SECONDS=90
REDIS_KEY_PREFIX=meridian
REDIS_USE_JSON=0
```

When the deploy finishes, Render will give you an API URL like:

```text
https://meridian-api.onrender.com
```

Check it with:

```bash
curl https://meridian-api.onrender.com/health
```

The expected response is:

```json
{"status":"ok"}
```

## Wire Vercel to the API

In the Vercel project for `apps/web`, set these Production environment variables:

```text
API_BASE_URL=https://meridian-api.onrender.com
NEXT_PUBLIC_API_BASE_URL=https://meridian-api.onrender.com
NEXT_PUBLIC_API_WS_URL=wss://meridian-api.onrender.com
```

Replace `meridian-api.onrender.com` with the actual Render hostname. Do not include a trailing slash.

Redeploy the Vercel frontend after setting these variables. `NEXT_PUBLIC_*` values are baked into the browser bundle at build time.

## Demo Warmup

Render free services sleep after idle time. Before judging, wake the API:

```bash
curl https://meridian-api.onrender.com/health
```

Wait for it to return `{"status":"ok"}` before opening the live voice demo.
