import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  analyzeRound,
  type RoundAnalysis,
  type ClubPerformance,
} from '@/engine';
import { suggestLearning, summarizeTrends, type TrendSummary } from '@/session';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, CenteredScreen, Header, Card, PrimaryButton, LinkText } from '@/ui/components';

/**
 * Post-Round Review (Phase I step 29). Read-only analytics for the round just
 * played, plus trends aggregated across every stored round. Learning stays
 * approve/reject on its own screen — here we only count what the round taught
 * and route there. All data is local; nothing on this path needs the network.
 */
export default function ReviewScreen() {
  const { state, repos } = useSessionContext();
  const [round, setRound] = useState<RoundAnalysis>();
  const [trends, setTrends] = useState<TrendSummary>();
  const [taught, setTaught] = useState(0);

  // A past round arrives via route param (from the home list); the round just
  // played comes from session state. Param wins so the list can review any round.
  const params = useLocalSearchParams<{ roundId?: string }>();
  const roundId = params.roundId ?? state?.round.id;
  const isActiveRound = roundId !== undefined && roundId === state?.round.id;

  useEffect(() => {
    if (!roundId) return;
    (async () => {
      const shots = await repos.rounds.listShots(roundId);
      setRound(analyzeRound(shots));
      setTaught(suggestLearning(shots).length);

      const rounds = await repos.rounds.listRounds();
      const withShots = await Promise.all(
        rounds.map(async (r) => ({ round: r, shots: await repos.rounds.listShots(r.id) })),
      );
      setTrends(summarizeTrends(withShots));
    })();
  }, [repos, roundId]);

  if (!roundId) {
    return (
      <CenteredScreen>
        <Text className="text-fg-muted">No round to review.</Text>
      </CenteredScreen>
    );
  }

  return (
    <Screen>
      <Header eyebrow="Post-round" title="Review" />

      {round === undefined ? (
        <Text className="text-fg-dim">Crunching the round…</Text>
      ) : round.shotCount === 0 ? (
        <Text className="text-fg-dim">No shots were logged this round.</Text>
      ) : (
        <>
          <Card title="This round">
            <Text className="mb-3 text-fg-muted">
              {round.shotCount} shots · {round.quality.good} good · {round.quality.neutral} neutral ·{' '}
              {round.quality.poor} poor
            </Text>
            {round.teeMiss.dominant ? (
              <Text className="mb-1 text-fg">
                Tee misses trend <Highlight>{round.teeMiss.dominant}</Highlight>.
              </Text>
            ) : null}
            <BarRow label="Left" value={round.teeMiss.left} total={teeTotal(round)} />
            <BarRow label="On line" value={round.teeMiss.onLine} total={teeTotal(round)} />
            <BarRow label="Right" value={round.teeMiss.right} total={teeTotal(round)} />

            {round.approachDistance.dominant ? (
              <Text className="mb-1 mt-4 text-fg">
                Approaches come up <Highlight>{round.approachDistance.dominant}</Highlight>.
              </Text>
            ) : (
              <View className="mt-4" />
            )}
            <BarRow label="Short" value={round.approachDistance.short} total={apprTotal(round)} />
            <BarRow label="Pin high" value={round.approachDistance.pinHigh} total={apprTotal(round)} />
            <BarRow label="Long" value={round.approachDistance.long} total={apprTotal(round)} />
          </Card>

          <Card title="Clubs this round">
            <ClubTable clubs={round.clubs} />
          </Card>
        </>
      )}

      {trends && trends.roundsAnalyzed > 1 ? (
        <Card title={`Trends · ${trends.roundsAnalyzed} rounds`}>
          <ClubTable clubs={trends.clubs} />
          <View className="mt-3 border-t border-line pt-3">
            <Text className="mb-2 text-xs uppercase tracking-wide text-fg-muted">
              By aggression
            </Text>
            {trends.byAggression.map((o) => (
              <View key={o.aggression} className="flex-row justify-between">
                <Text className="text-fg-muted capitalize">
                  {o.aggression} · {o.rounds} rounds
                </Text>
                <Text className="text-fg">{pct(o.goodRate)} good</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {taught > 0 && isActiveRound ? (
        <View className="mb-4">
          <PrimaryButton
            label={`Review what the round taught (${taught})`}
            onPress={() => router.push('/learning')}
          />
        </View>
      ) : null}

      <LinkText label="Done" onPress={() => router.replace('/')} className="mt-2" />
      <View className="h-6" />
    </Screen>
  );
}

const teeTotal = (a: RoundAnalysis) => a.teeMiss.left + a.teeMiss.onLine + a.teeMiss.right;
const apprTotal = (a: RoundAnalysis) =>
  a.approachDistance.short + a.approachDistance.pinHigh + a.approachDistance.long;
const pct = (v: number) => `${Math.round(v * 100)}%`;

function Highlight(props: { children: ReactNode }) {
  return <Text className="font-semibold text-accent">{props.children}</Text>;
}

/** Text label + proportional bar. total 0 → empty bar, never NaN width. */
function BarRow(props: { label: string; value: number; total: number }) {
  const width = props.total ? Math.round((props.value / props.total) * 100) : 0;
  return (
    <View className="mb-1 flex-row items-center gap-3">
      <Text className="w-20 text-fg-muted">{props.label}</Text>
      <View className="h-2 flex-1 rounded-full bg-surface-2">
        <View className="h-2 rounded-full bg-accent" style={{ width: `${width}%` }} />
      </View>
      <Text className="w-8 text-right text-fg-muted">{props.value}</Text>
    </View>
  );
}

function ClubTable(props: { clubs: readonly ClubPerformance[] }) {
  if (props.clubs.length === 0) return <Text className="text-fg-dim">No club data yet.</Text>;
  return (
    <>
      {props.clubs.map((c) => (
        <View key={`${c.kind}:${c.club}`} className="flex-row justify-between">
          <Text className="text-fg-muted">
            {c.club} · {c.kind} ({c.n})
          </Text>
          <Text className="text-fg">{pct(c.goodRate)} good</Text>
        </View>
      ))}
    </>
  );
}
