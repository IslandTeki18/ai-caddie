# ai-caddie

> A standalone Expo (React Native) app with a Convex backend and Clerk auth.

- **Platform:** mobile
- **Layout:** drawer
- **Features:** Authentication, Notifications

## Tech stack

- TypeScript
- Expo / React Native (mobile)
- Convex (backend)
- Clerk (authentication)

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values below.

### Clerk

- `CLERK_JWT_ISSUER_DOMAIN` — Clerk JWT issuer domain used by Convex `auth.config.ts` (e.g., https://your-app.clerk.accounts.dev).
- `CLERK_SECRET_KEY` — Clerk secret key used by Convex backend functions to verify identities.
- `CLERK_WEBHOOK_SECRET` — Signing secret for the Clerk webhook that syncs users into Convex (Clerk dashboard → Webhooks).
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key for the Expo mobile app.

### Web push (VAPID)

- `VAPID_PRIVATE_KEY` — VAPID private key for the Convex backend. From `npx web-push generate-vapid-keys`. Set it with `npx convex env set VAPID_PRIVATE_KEY <key>` (never commit it).
- `VAPID_PUBLIC_KEY` — VAPID public key for the Convex backend. Set it in the deployment with `npx convex env set VAPID_PUBLIC_KEY <key>`.
- `VAPID_SUBJECT` — VAPID subject for the Convex backend: a mailto: address or URL, e.g. mailto:you@example.com. Set it with `npx convex env set VAPID_SUBJECT mailto:you@example.com`.

## Getting started

```bash
# Install dependencies
pnpm install

# Start the Convex backend (provisions the deployment and generates convex/_generated on first run)
npx convex dev

# In another terminal, start the app
pnpm start
```

## Project structure

```
ai-caddie/
├── app/                        # expo-router screens
│   ├── (app)/                  # authenticated drawer routes
│   └── (auth)/                 # sign-in / sign-up
├── src/                        # components, lib, providers, theme
├── convex/                     # Convex backend (deployment dir)
│   ├── auth/                   # users table, queries/mutations, Clerk webhook
│   ├── notifications/          # notifications table
│   ├── pushSubscriptions/      # push subscriptions table
│   ├── schema.ts               # composed schema
│   ├── auth.config.ts          # Clerk provider config
│   ├── http.ts                 # HTTP router (Clerk webhook route)
│   ├── notifications.ts
│   ├── push.ts
│   └── pushSubscriptions.ts
├── app.json                    # Expo config
├── package.json
├── tsconfig.json
└── README.md
```
