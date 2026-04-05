# Dependencies (AI Roadmap migration)

All packages are listed in `package.json`. Install with:

```bash
npm install
```

This project uses **`.npmrc`** with `legacy-peer-deps=true` because some libraries (for example `next-view-transitions`) declare peer `next@^14` while this app uses **Next 16**.

## Main stacks

- **Next.js 16**, React 19
- **Clerk** — auth (optional at build time if env vars are unset; set keys for production)
- **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/cohere`) + **Zod**
- **Drizzle ORM** + **postgres** / **pg**
- **TanStack Query**, **Zustand**
- **React Flow**, **d3-hierarchy**, **html-to-image**
- **Radix UI** (per-component packages), **shadcn**-style UI, **Tailwind CSS 4**

## Environment

Copy `.env.example` to `.env.local` and fill values. For **Clerk**, add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the [Clerk dashboard](https://dashboard.clerk.com).

## Preserved starter template

The original create-next-app files under `app/`, `lib/`, `components/` were copied to **`_starter-snapshot/`** (excluded from TypeScript checks). The same UI is available at **`/starter`**.
