import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import type {
  Dispersion,
  ConfidenceModifiers,
  MissTendencies,
  HoleGeometry,
  CourseIntelligenceMemory,
  Weather,
} from '@/core';

/**
 * Local SQLite schema (dialect-agnostic drizzle-orm/sqlite-core), shared by both
 * the expo-sqlite (device) and better-sqlite3 (test) drivers. Mirrors SPEC §8.
 *
 * Every table carries a stable `id` (caller-generated, survives sync) and
 * `updatedAt` (epoch ms) for last-write-wins reconciliation. Fuzzy nested data
 * lives in `text({ mode: 'json' })` columns typed via the core zod-derived types.
 */

export const playerProfile = sqliteTable('player_profile', {
  id: text('id').primaryKey(),
  name: text('name'),
  confidenceModifiers: text('confidence_modifiers', { mode: 'json' })
    .$type<ConfidenceModifiers>()
    .notNull(),
  missTendencies: text('miss_tendencies', { mode: 'json' }).$type<MissTendencies>().notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const clubBaseline = sqliteTable('club_baseline', {
  id: text('id').primaryKey(),
  club: text('club').notNull(),
  distanceYards: real('distance_yards').notNull(),
  dispersion: text('dispersion', { mode: 'json' }).$type<Dispersion>().notNull(),
  tendency: text('tendency').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const course = sqliteTable('course', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const hole = sqliteTable('hole', {
  id: text('id').primaryKey(),
  courseId: text('course_id')
    .notNull()
    .references(() => course.id),
  number: integer('number').notNull(),
  par: integer('par').notNull(),
  geometry: text('geometry', { mode: 'json' }).$type<HoleGeometry>().notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const courseIntelligence = sqliteTable('course_intelligence', {
  id: text('id').primaryKey(),
  holeId: text('hole_id')
    .notNull()
    .references(() => hole.id),
  memory: text('memory', { mode: 'json' }).$type<CourseIntelligenceMemory>().notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const round = sqliteTable('round', {
  id: text('id').primaryKey(),
  courseId: text('course_id').references(() => course.id),
  weather: text('weather', { mode: 'json' }).$type<Weather>().notNull(),
  aggressionDefault: text('aggression_default').notNull(),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
  currentHole: integer('current_hole'),
  updatedAt: integer('updated_at').notNull(),
});

export const shot = sqliteTable('shot', {
  id: text('id').primaryKey(),
  roundId: text('round_id')
    .notNull()
    .references(() => round.id),
  holeNumber: integer('hole_number').notNull(),
  kind: text('kind').notNull(),
  club: text('club'),
  startDirection: text('start_direction').notNull(),
  curve: text('curve').notNull(),
  contact: text('contact').notNull(),
  distance: text('distance').notNull(),
  quality: text('quality').notNull(),
  timestamp: integer('timestamp').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/** Local-only key/value scratch (sync watermark). Never synced to Convex. */
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: integer('value').notNull(),
});

// --- Relations: course→holes, hole→intelligence, round→shots ---------------

export const courseRelations = relations(course, ({ many }) => ({
  holes: many(hole),
  rounds: many(round),
}));

export const holeRelations = relations(hole, ({ one }) => ({
  course: one(course, { fields: [hole.courseId], references: [course.id] }),
  intelligence: one(courseIntelligence, {
    fields: [hole.id],
    references: [courseIntelligence.holeId],
  }),
}));

export const courseIntelligenceRelations = relations(courseIntelligence, ({ one }) => ({
  hole: one(hole, { fields: [courseIntelligence.holeId], references: [hole.id] }),
}));

export const roundRelations = relations(round, ({ one, many }) => ({
  course: one(course, { fields: [round.courseId], references: [course.id] }),
  shots: many(shot),
}));

export const shotRelations = relations(shot, ({ one }) => ({
  round: one(round, { fields: [shot.roundId], references: [round.id] }),
}));

export const schema = {
  playerProfile,
  clubBaseline,
  course,
  hole,
  courseIntelligence,
  round,
  shot,
  syncMeta,
  courseRelations,
  holeRelations,
  courseIntelligenceRelations,
  roundRelations,
  shotRelations,
};
