/**
 * Stable record id generator. Every persisted entity needs a caller-generated
 * `id` that survives sync (last-write-wins keys on it). Time prefix keeps ids
 * roughly sortable; the random suffix avoids collisions inside one millisecond.
 *
 * ponytail: collision-safe for a single player logging one shot at a time; swap
 * to expo-crypto randomUUID only if multi-device sync ever needs global uniqueness.
 */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
