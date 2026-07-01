import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { AggressionLevel } from '@/core';
import { useSessionContext } from '@/ui/session-provider';
import { roundFromSetupForm } from '@/ui/round-form';
import { Field, PrimaryButton, Segmented } from '@/ui/components';

const AGGRESSION: readonly AggressionLevel[] = ['conservative', 'neutral', 'aggressive'];

/** Pre-Round Setup (step 20). All fields optional except aggression default. */
export default function SetupScreen() {
  const { repos, beginRound, dispatch } = useSessionContext();
  const [windMph, setWindMph] = useState('');
  const [tempF, setTempF] = useState('');
  const [aggression, setAggression] = useState<AggressionLevel>('neutral');

  const numeric = (s: string): number | undefined => {
    const n = Number(s);
    return s.trim() === '' || Number.isNaN(n) ? undefined : n;
  };

  const start = async () => {
    const round = roundFromSetupForm(
      { windMph: numeric(windMph), tempF: numeric(tempF), aggressionDefault: aggression },
      Date.now(),
    );
    const baselines = await repos.players.listClubBaselines();
    const profile = await repos.players.getProfile();
    await beginRound(round, baselines, profile);
    await dispatch({ type: 'START_HOLE', holeNumber: 1 });
    router.replace('/hole');
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6">
      <Text className="mb-6 text-2xl font-semibold text-slate-900">New Round</Text>

      <Field label="Wind (mph)">
        <TextInput
          accessibilityLabel="Wind (mph)"
          keyboardType="numeric"
          value={windMph}
          onChangeText={setWindMph}
          placeholder="optional"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        />
      </Field>

      <Field label="Temperature (°F)">
        <TextInput
          accessibilityLabel="Temperature (°F)"
          keyboardType="numeric"
          value={tempF}
          onChangeText={setTempF}
          placeholder="optional"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        />
      </Field>

      <Segmented label="Default aggression" value={aggression} options={AGGRESSION} onChange={setAggression} />

      <PrimaryButton label="Start round" onPress={start} />

      <View className="mt-3">
        <Text
          accessibilityRole="link"
          onPress={() => router.push('/profile')}
          className="text-center text-emerald-700"
        >
          Edit player profile
        </Text>
      </View>
    </ScrollView>
  );
}
