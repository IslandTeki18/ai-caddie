import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { newId, type ClubBaseline, type PlayerProfile } from '@/core';
import { useRepos } from '@/ui/session-provider';
import { Field, PrimaryButton } from '@/ui/components';

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
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6">
      <Text className="mb-6 text-2xl font-semibold text-slate-900">Player Profile</Text>

      <Field label="Name">
        <TextInput
          accessibilityLabel="Name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setSaved(false);
          }}
          placeholder="optional"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        />
      </Field>

      <Text className="mb-2 text-sm font-medium text-slate-600">Club yardages</Text>
      {baselines.length === 0 ? (
        <Text className="mb-4 text-slate-400">No baselines yet. Import TrackMan data to populate.</Text>
      ) : (
        baselines.map((b) => (
          <View key={b.club} className="mb-3 flex-row items-center justify-between">
            <Text className="text-slate-800">{b.club}</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                accessibilityLabel={`${b.club} carry`}
                keyboardType="numeric"
                value={String(b.distanceYards)}
                onChangeText={(t) => {
                  setDistance(b.club, t);
                  setSaved(false);
                }}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-right text-slate-900"
              />
              <Text className="text-slate-500">yds</Text>
            </View>
          </View>
        ))
      )}

      <PrimaryButton label={saved ? 'Saved' : 'Save profile'} onPress={save} />

      <Text accessibilityRole="link" onPress={() => router.back()} className="mt-3 text-center text-emerald-700">
        Back
      </Text>
    </ScrollView>
  );
}
