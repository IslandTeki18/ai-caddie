import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { newId, type ClubBaseline, type PlayerProfile } from '@/core';
import { useRepos } from '@/ui/session-provider';
import { Screen, Header, PrimaryButton, TextField, LinkText } from '@/ui/components';

/** Player Profile (step 21): view/edit club baselines + name via PlayerRepository. */
export default function ProfileScreen() {
  const repos = useRepos();
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<PlayerProfile>();
  const [baselines, setBaselines] = useState<ClubBaseline[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await repos.players.getProfile();
      setProfile(p);
      setName(p?.name ?? '');
      setBaselines(await repos.players.listClubBaselines());
    })();
  }, [repos]);

  const setDistance = (club: string, text: string) =>
    setBaselines((prev) =>
      prev.map((b) => (b.club === club ? { ...b, distanceYards: Number(text) || 0 } : b)),
    );

  const save = async () => {
    const now = Date.now();
    await repos.players.upsertClubBaselines(baselines.map((b) => ({ ...b, updatedAt: now })));
    const next: PlayerProfile = {
      id: profile?.id ?? newId(),
      name: name.trim() || undefined,
      confidenceModifiers: profile?.confidenceModifiers ?? {},
      missTendencies: profile?.missTendencies ?? {},
      updatedAt: now,
    };
    await repos.players.saveProfile(next);
    setProfile(next);
    setSaved(true);
  };

  return (
    <Screen>
      <Header eyebrow="Profile" title="Player" />

      <TextField
        label="Name"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setSaved(false);
        }}
        placeholder="optional"
      />

      <Text className="mb-2 text-sm font-medium text-fg-muted">Club yardages</Text>
      {baselines.length === 0 ? (
        <Text className="mb-4 text-fg-dim">No baselines yet. Import TrackMan data to populate.</Text>
      ) : (
        baselines.map((b) => (
          <View key={b.club} className="mb-3 flex-row items-center justify-between">
            <Text className="text-fg">{b.club}</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                accessibilityLabel={`${b.club} carry`}
                keyboardType="numeric"
                placeholderTextColor="#5E675F"
                value={String(b.distanceYards)}
                onChangeText={(t) => {
                  setDistance(b.club, t);
                  setSaved(false);
                }}
                className="w-20 rounded-xl border border-line bg-surface px-4 py-3 text-right text-fg"
              />
              <Text className="text-fg-muted">yds</Text>
            </View>
          </View>
        ))
      )}

      <PrimaryButton label={saved ? 'Saved' : 'Save profile'} onPress={save} />

      <LinkText label="Back" onPress={() => router.back()} className="mt-4" />
    </Screen>
  );
}
