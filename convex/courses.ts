import { action } from './_generated/server';
import { v } from 'convex/values';

/**
 * Course lookup via GolfCourseAPI, proxied server-side so the API key
 * (GOLF_API_KEY) never ships in the app bundle. This is an additive, online-only
 * convenience for pre-round setup — it is NOT on the play path, so the
 * offline-is-never-optional invariant holds. The client saves the chosen course
 * into local SQLite (source of truth); the generic sync layer mirrors it back
 * to Convex.
 *
 * Returns a trimmed shape matching the client's Course/Hole needs. Par is
 * constant across tees, so hole pars come from the first available tee
 * (male preferred, else female).
 */

const API = 'https://api.golfcourseapi.com/v1/search';

interface ApiHole {
  par?: number;
  yardage?: number;
  handicap?: number;
}
interface ApiTee {
  holes?: ApiHole[];
}
interface ApiCourse {
  id: number;
  club_name?: string;
  course_name?: string;
  location?: { city?: string; state?: string; latitude?: number; longitude?: number };
  tees?: { male?: ApiTee[]; female?: ApiTee[] };
}

export interface CourseHit {
  apiId: number;
  name: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  holes: { number: number; par: number; yardage?: number; handicap?: number }[];
}

export const searchCourses = action({
  args: { query: v.string() },
  handler: async (_ctx, { query }): Promise<CourseHit[]> => {
    const q = query.trim();
    if (q.length < 2) return [];
    const key = process.env.GOLF_API_KEY;
    if (!key) throw new Error('GOLF_API_KEY is not configured on the Convex deployment');

    const res = await fetch(`${API}?search_query=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Key ${key}` },
    });
    if (!res.ok) throw new Error(`GolfCourseAPI ${res.status}`);

    const body = (await res.json()) as { courses?: ApiCourse[] };
    return (body.courses ?? []).map((c) => {
      const tee = c.tees?.male?.[0] ?? c.tees?.female?.[0];
      const holes = (tee?.holes ?? [])
        .filter((h): h is Required<Pick<ApiHole, 'par'>> & ApiHole => typeof h.par === 'number')
        .map((h, i) => ({ number: i + 1, par: h.par as number, yardage: h.yardage, handicap: h.handicap }));
      return {
        apiId: c.id,
        name: c.club_name || c.course_name || 'Unknown course',
        city: c.location?.city,
        state: c.location?.state,
        latitude: c.location?.latitude,
        longitude: c.location?.longitude,
        holes,
      };
    });
  },
});
