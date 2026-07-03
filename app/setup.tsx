import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { AggressionLevel, Course } from '@/core';
import { useSessionContext } from '@/ui/session-provider';
import { roundFromSetupForm } from '@/ui/round-form';
import { Screen, Header, Card, PrimaryButton, Segmented, TextField, LinkText } from '@/ui/components';
import { convex } from './convex';
import { api } from '../convex/_generated/api';

const AGGRESSION: readonly AggressionLevel[] = ['conservative', 'neutral', 'aggressive'];

/** Trimmed course result from the Convex searchCourses action (mirrors CourseHit). */
interface CourseHit {
  apiId: number;
  name: string;
  city?: string;
  state?: string;
  holes: { number: number; par: number; yardage?: number; handicap?: number }[];
}

/** Pre-Round Setup (step 20 + course tracking). All fields optional. */
export default function SetupScreen() {
  const { repos, beginRound, dispatch } = useSessionContext();
  const [windMph, setWindMph] = useState('');
  const [tempF, setTempF] = useState('');
  const [aggression, setAggression] = useState<AggressionLevel>('neutral');

  // Course picker
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseHit[]>();
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string }>();
  const [recent, setRecent] = useState<Course[]>([]);

  useEffect(() => {
    void repos.courses.listCourses().then(setRecent);
  }, [repos]);

  const numeric = (s: string): number | undefined => {
    const n = Number(s);
    return s.trim() === '' || Number.isNaN(n) ? undefined : n;
  };

  const runSearch = async () => {
    if (!convex || query.trim().length < 2) return;
    setSearching(true);
    try {
      setResults(await convex.action(api.courses.searchCourses, { query }));
    } catch {
      setResults([]); // surface an empty "no matches" rather than crash setup
    } finally {
      setSearching(false);
    }
  };

  // Save the picked course + its holes locally (source of truth); the sync loop
  // mirrors them to Convex. Stable ids make re-picking the same course idempotent.
  const pick = async (hit: CourseHit) => {
    const now = Date.now();
    const id = `gca-${hit.apiId}`;
    await repos.courses.saveCourse({ id, name: hit.name, updatedAt: now });
    await repos.courses.saveHoles(
      hit.holes.map((h) => ({
        id: `${id}-h${h.number}`,
        courseId: id,
        number: h.number,
        par: h.par,
        geometry: { yardage: h.yardage, handicap: h.handicap },
        updatedAt: now,
      })),
    );
    setSelected({ id, name: hit.name });
    setResults(undefined);
    setQuery('');
    setRecent(await repos.courses.listCourses());
  };

  const start = async () => {
    const round = roundFromSetupForm(
      { courseId: selected?.id, windMph: numeric(windMph), tempF: numeric(tempF), aggressionDefault: aggression },
      Date.now(),
    );
    const baselines = await repos.players.listClubBaselines();
    const profile = await repos.players.getProfile();
    await beginRound(round, baselines, profile);
    await dispatch({ type: 'START_HOLE', holeNumber: 1 });
    router.replace('/hole');
  };

  return (
    <Screen>
      <Header eyebrow="Set up" title="New round" />

      <Card title="Course">
        {selected ? (
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-base font-semibold text-fg">✓ {selected.name}</Text>
            <LinkText label="Change" onPress={() => setSelected(undefined)} className="ml-3" />
          </View>
        ) : !convex ? (
          <Text className="text-fg-dim">Course search needs a connection. You can start without one.</Text>
        ) : (
          <>
            <TextField
              label="Search by name"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              placeholder="e.g. Pebble Beach"
            />
            <PrimaryButton label={searching ? 'Searching…' : 'Search'} onPress={runSearch} disabled={searching || query.trim().length < 2} />

            {results !== undefined ? (
              results.length === 0 ? (
                <Text className="mt-3 text-fg-dim">No matches.</Text>
              ) : (
                <View className="mt-3 gap-2">
                  {results.slice(0, 8).map((hit) => (
                    <Pressable
                      key={hit.apiId}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${hit.name}`}
                      onPress={() => pick(hit)}
                      className="rounded-xl border border-line bg-surface-2 px-4 py-3"
                    >
                      <Text className="text-base font-medium text-fg">{hit.name}</Text>
                      <Text className="text-sm text-fg-muted">
                        {[hit.city, hit.state].filter(Boolean).join(', ')} · {hit.holes.length} holes
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )
            ) : recent.length > 0 ? (
              <View className="mt-4">
                <Text className="mb-1.5 text-sm font-medium text-fg-muted">Recent</Text>
                {recent.map((c) => (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${c.name}`}
                    onPress={() => setSelected({ id: c.id, name: c.name })}
                    className="border-b border-line py-2.5"
                  >
                    <Text className="text-base text-fg">{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </Card>

      <TextField label="Wind (mph)" keyboardType="numeric" value={windMph} onChangeText={setWindMph} placeholder="optional" />
      <TextField label="Temperature (°F)" keyboardType="numeric" value={tempF} onChangeText={setTempF} placeholder="optional" />

      <Segmented label="Default aggression" value={aggression} options={AGGRESSION} onChange={setAggression} />

      <PrimaryButton label="Start round" onPress={start} />

      <View className="mt-4">
        <LinkText label="Edit player profile" onPress={() => router.push('/profile')} />
      </View>
    </Screen>
  );
}
