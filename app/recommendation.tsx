import { Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  currentRecommendation,
  currentPlaysLike,
  currentDispersion,
  playsLikeLabels,
  recentShots,
  recentStartPattern,
  type StartPattern,
} from '@/session';
import type { Shot } from '@/core';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, CenteredScreen, Eyebrow, PrimaryButton } from '@/ui/components';

const OPPOSITE = { left: 'right', right: 'left' } as const;
const START_GLYPH: Record<Shot['startDirection'], string> = { left: 'L', onLine: '•', right: 'R' };

/** The call (2c): one confident hit card, the plays-like math, why, cue, log. */
export default function RecommendationScreen() {
  const { state } = useSessionContext();

  if (!state) {
    return (
      <CenteredScreen>
        <Text className="text-fg-muted">No shot in progress.</Text>
      </CenteredScreen>
    );
  }

  const rec = currentRecommendation(state);
  if (!rec) {
    return (
      <CenteredScreen>
        <Text className="text-fg-muted">No recommendation — set shot context first.</Text>
      </CenteredScreen>
    );
  }

  const plays = currentPlaysLike(state);
  const labels = playsLikeLabels(state);
  const baseline = state.baselines.find((b) => b.club === state.currentShot?.club);
  const lateral = Math.round(currentDispersion(state).lateralYards);
  const recent = recentShots(state.shots);
  const pattern = recentStartPattern(state.shots);

  return (
    <Screen footer={<PrimaryButton large label="Log result" onPress={() => router.push('/log')} />}>
      <View className="mb-3 rounded-[22px] bg-accent px-5 pb-[15px] pt-4">
        <Text className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent-ink opacity-60">Hit</Text>
        <Text className="text-[52px] font-extrabold leading-[58px] tracking-[-1.8px] text-accent-ink">{rec.club}</Text>
        <Text className="mt-1 text-base font-bold text-accent-ink">
          {rec.target}, {rec.shape}
        </Text>
        <View className="mt-3 flex-row gap-2.5">
          <Inset label="Best miss" value={rec.bestMiss} />
          <Inset label="Do not" value={rec.doNot} />
        </View>
      </View>

      {plays ? (
        <View className="mb-3 rounded-[18px] border border-line bg-surface px-[18px] py-3.5">
          <View className="flex-row items-center justify-between">
            <Eyebrow className="font-bold">Plays like</Eyebrow>
            <Text className="text-[30px] font-extrabold text-fg">{Math.round(plays.total)}</Text>
          </View>
          <View className="mt-1 gap-[5px]">
            <Term label={labels.base} v={plays.base} />
            <Term label={labels.wind} v={plays.wind} />
            <Term label={labels.temp} v={plays.temp} />
            <Term label={labels.elevation} v={plays.elevation} />
            <Term label={labels.strikeTrend} v={plays.strikeTrend} />
          </View>
          <View className="mt-2 flex-row justify-between border-t border-line pt-2">
            <Text className="text-sm font-bold text-fg">Total</Text>
            <Text className="text-sm font-bold text-accent" style={{ fontVariant: ['tabular-nums'] }}>
              {Math.round(plays.total)}
            </Text>
          </View>
        </View>
      ) : null}

      {baseline || pattern ? (
        <View className="mb-3 rounded-[18px] border border-line bg-surface px-[18px] py-3.5">
          <Eyebrow className="mb-1">Why the {rec.club}</Eyebrow>
          {baseline ? (
            <Text className="text-[13px] leading-5 text-fg-muted">
              Your {baseline.club} carries{' '}
              <Text className="font-semibold text-fg">
                {Math.round(baseline.distanceYards)} average, ±{lateral} lateral
              </Text>{' '}
              today.
            </Text>
          ) : null}
          {pattern ? (
            <View className={`flex-row items-center gap-3 ${baseline ? 'mt-3 border-t border-line pt-3' : ''}`}>
              <View className="flex-row gap-1.5">
                {recent.map((s, i) => (
                  <View
                    key={s.id}
                    className={`h-6 w-6 items-center justify-center rounded-md ${i === recent.length - 1 ? 'bg-line' : 'bg-surface-2'}`}
                  >
                    <Text className={`text-xs font-semibold ${i === recent.length - 1 ? 'text-fg' : 'text-fg-muted'}`}>
                      {START_GLYPH[s.startDirection]}
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="flex-1 text-[13px] leading-5 text-fg-muted">{patternSentence(pattern)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View className="rounded-[18px] bg-accent-soft px-[18px] py-[13px]">
        <Text className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent opacity-80">Cue</Text>
        <Text className="mt-0.5 text-xl font-bold text-fg">{rec.cue}</Text>
      </View>
    </Screen>
  );
}

function patternSentence(p: StartPattern): string {
  return `${p.count} of ${p.total} ${p.direction} today — target moved ${OPPOSITE[p.direction]} to absorb it.`;
}

function Inset(props: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl px-3 py-[9px]" style={{ backgroundColor: 'rgba(11,20,8,0.12)' }}>
      <Text className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-accent-ink opacity-60">{props.label}</Text>
      <Text className="text-base font-bold text-accent-ink">{props.value}</Text>
    </View>
  );
}

function Term(props: { label: string; v: number }) {
  const n = Math.round(props.v);
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-fg-muted">{props.label}</Text>
      <Text className="text-sm text-fg" style={{ fontVariant: ['tabular-nums'] }}>
        {n > 0 ? `+${n}` : n}
      </Text>
    </View>
  );
}
