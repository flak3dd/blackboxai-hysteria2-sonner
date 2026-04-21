# hysteria2-c2-advanced

A [Next.js 16](https://nextjs.org) app (App Router, Turbopack, React 19) wired up with [Sonner](https://sonner.emilkowal.ski/) toasts rendered through a [shadcn/ui](https://ui.shadcn.com/)-style `Toaster` component and styled with [Tailwind CSS v4](https://tailwindcss.com/).

## Stack

- **Framework:** Next.js `16.2.4` (App Router, Turbopack builds)
- **React:** `19.2.4`
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`, `tw-animate-css`
- **UI primitives:** `@base-ui/react`, `shadcn`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Toasts:** `sonner` (`<Toaster />` mounted in `app/layout.tsx`)
- **Backend SDKs:** `firebase`, `firebase-admin`
- **Dates:** `date-fns`
- **Language:** TypeScript `^5`, ESLint `^9` (via `eslint-config-next`)

## Requirements

- Node.js `>= 20.12` (Node 22 is fine; some dev deps warn on earlier versions)
- npm `>= 10` (the repo ships a `package-lock.json`)

## Getting started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Edit `app/page.tsx` to change the landing page — the page auto-updates on save.

## Scripts

| Script          | What it does                                               |
| --------------- | ---------------------------------------------------------- |
| `npm run dev`   | Start the Next.js dev server                               |
| `npm run build` | Production build (`next build`, runs TypeScript type-check) |
| `npm run start` | Start the production server after a build                  |
| `npm run lint`  | Run ESLint (`eslint-config-next`)                          |

## Project layout

```
app/
  layout.tsx        # Root layout; mounts <Toaster />
  page.tsx          # Landing page
  globals.css       # Tailwind entry + theme tokens
components/
  ui/
    button.tsx      # shadcn-style Button
    sonner.tsx      # shadcn-style Toaster wrapping `sonner`
lib/
  utils.ts          # `cn()` helper (clsx + tailwind-merge)
public/             # Static assets
```

## Toasts

A `<Toaster />` is mounted once in `app/layout.tsx` (see `components/ui/sonner.tsx`). Trigger toasts from anywhere with the `sonner` API:

```tsx
"use client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function DemoButton() {
  return (
    <Button onClick={() => toast.success("Saved!")}>
      Save
    </Button>
  )
}
```

The `Toaster` also wires custom icons (`lucide-react`) for `success`, `info`, `warning`, `error`, and `loading` states, and exposes a few CSS custom properties (`--brand`, `--moderate-low`, `--height`) on its root for themeing.

## Firebase

`firebase` and `firebase-admin` are included as dependencies for client and server-side Firebase usage. Configure them via environment variables (e.g. `NEXT_PUBLIC_FIREBASE_*` for the client SDK, service-account credentials for admin) before wiring them into your pages or server actions — no Firebase initialization is set up in the repo yet.

## Deploy

The project is a stock Next.js 16 app and deploys cleanly to [Vercel](https://vercel.com/new?framework=next.js). See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for other targets.
