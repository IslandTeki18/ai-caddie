import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import type { AggressionLevel } from '@/core';
import { useSessionContext } from '@/ui/session-provider';
import { roundFromSetupForm } from '@/ui/round-form';
import { Screen, Header, PrimaryButton, Segmented, TextField, LinkText } from '@/ui/components';

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
    <Screen>
      <Header eyebrow="Set up" title="New round" />

      <TextField
        label="Wind (mph)"
        keyboardType="numeric"
        value={windMph}
        onChangeText={setWindMph}
        placeholder="optional"
      />

      <TextField
        label="Temperature (°F)"
        keyboardType="numeric"
        value={tempF}
        onChangeText={setTempF}
        placeholder="optional"
      />

      <Segmented label="Default aggression" value={aggression} options={AGGRESSION} onChange={setAggression} />

      <PrimaryButton label="Start round" onPress={start} />

      <View className="mt-4">
        <LinkText label="Edit player profile" onPress={() => router.push('/profile')} />
      </View>
    </Screen>
  );
}
