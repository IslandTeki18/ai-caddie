import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { analyzeRound, type RoundAnalysis, type ClubPerformance, type SuggestedUpdate } from '@/engine';
import { suggestLearning, applyApprovedUpdate, summarizeTrends, type TrendSummary } from '@/session';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, CenteredScreen, Header, Card, Eyebrow, PrimaryButton, LinkText } from '@/ui/components';

/**
 * Post-Round Review (2e). Read-only analytics for the round just played, trends
 * across every stored round, and the course-learning suggestions inline as
 * Remember / Discard cards. Nothing persists without "Remember it"
 * (`applyApprovedUpdate`). All data is local.
 */
export default function ReviewScreen() {
  const { state, repos } = useSessionContext();
  const [round, setRound] = useState<RoundAnalysis>();
  const [trends, setTrends] = useState<TrendSummary>();
  const [suggestions, setSuggestions] = useState<SuggestedUpdate[]>([]);

  // A past round arrives via route param (from the home list); the round just
  // played comes from session state. Param wins so the list can review any round.
  const params = useLocalSearchParams<{ roundId?: string }>();
  const roundId = params.roundId ?? state?.round.id;
  const isActiveRound = roundId !== undefined && roundId === state?.round.id;
  const courseId = isActiveRound ? state?.round.courseId : undefined;

  useEffect(() => {
    if (!roundId) return;
    (async () => {
      const shots = await repos.rounds.listShots(roundId);
      setRound(analyzeRound(shots));

      // Learning only for the round just played — a past round was already reviewed.
      if (isActiveRound) {
        const holeIdByNumber: Record<number, string> = {};
        if (courseId) for (const h of await repos.courses.listHoles(courseId)) holeIdByNumber[h.number] = h.id;
        setSuggestions(suggestLearning(shots, holeIdByNumber));
      }

      const rounds = await repos.rounds.listRounds();
      const withShots = await Promise.all(
        rounds.map(async (r) => ({ round: r, shots: await repos.rounds.listShots(r.id) })),
      );
      setTrends(summarizeTrends(withShots));
    })();
  }, [repos, roundId, isActiveRound, courseId]);

  const decide = async (s: SuggestedUpdate, remember: boolean) => {
    if (remember && s.holeId) await applyApprovedUpdate(repos.courses, s, Date.now());
    setSuggestions((prev) => prev.filter((x) => x !== s));
  };

  if (!roundId) {
    return (
      <CenteredScreen>
        <Text className="text-fg-muted">No round to review.</Text>
      </CenteredScreen>
    );
  }

  const [first, ...rest] = suggestions;

  return (
    <Screen>
      <Header eyebrow="Post-round" title="Review" />

      {round === undefined ? (
        <Text className="text-fg-dim">Crunching the round…</Text>
      ) : round.shotCount === 0 ? (
        <Text className="text-fg-dim">No shots were logged this round.</Text>
      ) : (
        <>
          <Card>
            <Text className="mb-4 text-[15px] leading-[22px] text-fg">
              {round.shotCount} shots, {round.quality.good} good, {round.quality.poor} poor.
              {round.teeMiss.dominant ? (
                <> Tee misses trend <Highlight>{round.teeMiss.dominant}</Highlight>.</>
              ) : null}
              {round.approachDistance.dominant ? (
                <> Approaches come up <Highlight>{round.approachDistance.dominant}</Highlight>.</>
              ) : null}
            </Text>
            <Eyebrow className="mb-1.5">Tee miss</Eyebrow>
            <BarRow label="Left" value={round.teeMiss.left} total={teeTotal(round)} />
            <BarRow label="On line" value={round.teeMiss.onLine} total={teeTotal(round)} />
            <BarRow label="Right" value={round.teeMiss.right} total={teeTotal(round)} />
            <Eyebrow className="mb-1.5 mt-4">Approach distance</Eyebrow>
            <BarRow label="Short" value={round.approachDistance.short} total={apprTotal(round)} />
            <BarRow label="Pin high" value={round.approachDistance.pinHigh} total={apprTotal(round)} />
            <BarRow label="Long" value={round.approachDistance.long} total={apprTotal(round)} />
          </Card>

          <Card>
            <Eyebrow className="mb-2">Clubs this round</Eyebrow>
            <ClubTable clubs={round.clubs} />
          </Card>
        </>
      )}

      {trends && trends.roundsAnalyzed > 1 ? (
        <Card>
          <Eyebrow className="mb-2">Trends · {trends.roundsAnalyzed} rounds</Eyebrow>
          <ClubTable clubs={trends.clubs} />
          <View className="mt-3 border-t border-line pt-3">
            <Eyebrow className="mb-2">By aggression</Eyebrow>
            {trends.byAggression.map((o) => (
              <View key={o.aggression} className="flex-row justify-between">
                <Text className="text-[15px] capitalize text-fg-muted">
                  {o.aggression} · {o.rounds} rounds
                </Text>
                <Text className="text-[15px] text-fg">{pct(o.goodRate)} good</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {first ? (
        <Card>
          <Eyebrow>Hole {first.holeNumber}</Eyebrow>
          <Text className="mt-0.5 text-[17px] font-bold text-fg">{LABELS[first.kind]}</Text>
          <Text className="mb-4 mt-1 text-sm leading-[21px] text-fg-muted">{first.rationale}</Text>
          {first.holeId ? null : (
            <Text className="mb-3 text-xs text-fg-dim">Not linked to a seeded hole — can't be remembered.</Text>
          )}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton label="Remember it" onPress={() => decide(first, true)} disabled={!first.holeId} />
            </View>
            <View className="flex-1">
              <PrimaryButton outline label="Discard" onPress={() => decide(first, false)} />
            </View>
          </View>
          <Text className="mt-3 text-center text-[13px] text-fg-dim">
            {rest.length} more suggestion{rest.length === 1 ? '' : 's'} · nothing changes without your say
          </Text>
        </Card>
      ) : null}

      <LinkText label="Done" onPress={() => router.replace('/')} className="mt-2" />
      <View className="h-6" />
    </Screen>
  );
}

const LABELS: Record<SuggestedUpdate['kind'], string> = {
  preferredTeeClub: 'Preferred tee club',
  poorClubs: 'Underperforming club',
  safeMissZones: 'Safe miss zone',
  leaveZones: 'Preferred leave',
};

const teeTotal = (a: RoundAnalysis) => a.teeMiss.left + a.teeMiss.onLine + a.teeMiss.right;
const apprTotal = (a: RoundAnalysis) =>
  a.approachDistance.short + a.approachDistance.pinHigh + a.approachDistance.long;
const pct = (v: number) => `${Math.round(v * 100)}%`;

function Highlight(props: { children: ReactNode }) {
  return <Text className="font-bold text-accent">{props.children}</Text>;
}

/** Text label + proportional bar. total 0 → empty bar, never NaN width. */
function BarRow(props: { label: string; value: number; total: number }) {
  const width = props.total ? Math.round((props.value / props.total) * 100) : 0;
  return (
    <View className="mb-1.5 flex-row items-center gap-3">
      <Text className="w-[66px] text-sm text-fg-muted">{props.label}</Text>
      <View className="h-2 flex-1 rounded-full bg-surface-2">
        <View className="h-2 rounded-full bg-accent" style={{ width: `${width}%` }} />
      </View>
      <Text className="w-5 text-right text-sm text-fg-muted">{props.value}</Text>
    </View>
  );
}

function ClubTable(props: { clubs: readonly ClubPerformance[] }) {
  if (props.clubs.length === 0) return <Text className="text-fg-dim">No club data yet.</Text>;
  return (
    <View className="gap-2">
      {props.clubs.map((c) => (
        <View key={`${c.kind}:${c.club}`} className="flex-row justify-between">
          <Text className="text-[15px] text-fg-muted">
            {c.club} · {c.kind} ({c.n})
          </Text>
          <Text className="text-[15px] text-fg">{pct(c.goodRate)} good</Text>
        </View>
      ))}
    </View>
  );
}
