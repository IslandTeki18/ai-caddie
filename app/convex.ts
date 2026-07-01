import { ConvexReactClient } from 'convex/react';

/**
 * Single app-wide Convex client. Null when EXPO_PUBLIC_CONVEX_URL is unset so the
 * app still launches fully offline (offline-is-never-optional) — the sync badge
 * simply reads "offline". Convex is additive backup, never on the play path.
 */
const url = process.env.EXPO_PUBLIC_CONVEX_URL;
export const convex = url ? new ConvexReactClient(url) : null;
