import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { currentRecommendation, currentPlaysLike } from '@/session';
import { useSessionContext } from '@/ui/session-provider';
import { PrimaryButton } from '@/ui/components';

/** Recommendation Card (step 24): six fields + expandable plays-like, routes to logging. */
export default function RecommendationScreen() {
  const { state } = useSessionContext();
  const [expanded, setExpanded] = useState(false);

  if (!state) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-slate-500">No shot in progress.</Text>
      </View>
    );
  }

  const rec = currentRecommendation(state);
  const plays = currentPlaysLike(state);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6">
      {!rec ? (
        <Text className="text-slate-500">No recommendation — set shot context first.</Text>
      ) : (
        <View className="mb-6 rounded-2xl border border-slate-200 p-5">
          <Row label="Club" value={rec.club} big />
          <Row label="Target" value={rec.target} />
          <Row label="Shape" value={rec.shape} />
          <Row label="Best miss" value={rec.bestMiss} />
          <Row label="Do NOT" value={rec.doNot} />
          <Row label="Cue" value={rec.cue} />
        </View>
      )}

      {plays ? (
        <View className="mb-6">
          <Text
            accessibilityRole="button"
            onPress={() => setExpanded((e) => !e)}
            className="text-emerald-700"
          >
            Plays like {plays.total} yds {expanded ? '▲' : '▼'}
          </Text>
          {expanded ? (
            <View className="mt-2 rounded-lg bg-slate-50 p-3">
              <PlayRow label="Base" v={plays.base} />
              <PlayRow label="Wind" v={plays.wind} />
              <PlayRow label="Temp" v={plays.temp} />
              <PlayRow label="Elevation" v={plays.elevation} />
              <PlayRow label="Strike/lie" v={plays.strikeTrend} />
              <View className="mt-1 border-t border-slate-200 pt-1">
                <PlayRow label="Total" v={plays.total} />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <PrimaryButton label="Log result →" onPress={() => router.push('/log')} />
      <View className="h-6" />
    </ScrollView>
  );
}

function Row(props: { label: string; value: string; big?: boolean }) {
  return (
    <View className="mb-2">
      <Text className="text-xs uppercase tracking-wide text-slate-400">{props.label}</Text>
      <Text className={props.big ? 'text-2xl font-semibold text-slate-900' : 'text-base text-slate-800'}>
        {props.value}
      </Text>
    </View>
  );
}

function PlayRow(props: { label: string; v: number }) {
  const sign = props.v > 0 ? `+${props.v}` : `${props.v}`;
  return (
    <View className="flex-row justify-between">
      <Text className="text-slate-600">{props.label}</Text>
      <Text className="text-slate-800">{sign}</Text>
    </View>
  );
}
