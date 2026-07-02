import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { suggestLearning, applyApprovedUpdate } from '@/session';
import type { SuggestedUpdate } from '@/engine';
import { useSessionContext } from '@/ui/session-provider';
import { PrimaryButton } from '@/ui/components';

/**
 * Course-learning review (Phase H step 27). After a round, surface detected
 * per-hole patterns as approve/reject cards. Approve persists into
 * courseIntelligence; reject discards. Strategy never changes without approval.
 */
export default function LearningScreen() {
  const { state, repos } = useSessionContext();
  const [suggestions, setSuggestions] = useState<SuggestedUpdate[]>();

  const roundId = state?.round.id;
  const courseId = state?.round.courseId;

  useEffect(() => {
    if (!roundId) return;
    (async () => {
      const shots = await repos.rounds.listShots(roundId);
      const holeIdByNumber: Record<number, string> = {};
      if (courseId) {
        for (const h of await repos.courses.listHoles(courseId)) holeIdByNumber[h.number] = h.id;
      }
      setSuggestions(suggestLearning(shots, holeIdByNumber));
    })();
  }, [repos, roundId, courseId]);

  const decide = async (index: number, approve: boolean) => {
    const s = suggestions?.[index];
    if (!s) return;
    if (approve && s.holeId) await applyApprovedUpdate(repos.courses, s, Date.now());
    setSuggestions((prev) => prev?.filter((_, i) => i !== index));
  };

  if (!state) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-slate-500">No round to review.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6">
      <Text className="mb-1 text-2xl font-semibold text-slate-900">What the round taught</Text>
      <Text className="mb-6 text-slate-500">Approve to remember, reject to discard. Nothing changes on its own.</Text>

      {suggestions === undefined ? (
        <Text className="text-slate-400">Scanning shots…</Text>
      ) : suggestions.length === 0 ? (
        <Text className="text-slate-400">No new patterns crossed the confidence threshold.</Text>
      ) : (
        suggestions.map((s, i) => (
          <View key={`${s.holeNumber}-${s.kind}`} className="mb-4 rounded-2xl border border-slate-200 p-5">
            <Text className="text-xs uppercase tracking-wide text-slate-400">Hole {s.holeNumber}</Text>
            <Text className="mb-1 text-base font-medium text-slate-900">{LABELS[s.kind]}</Text>
            <Text className="mb-4 text-slate-600">{s.rationale}</Text>
            {s.holeId ? null : (
              <Text className="mb-3 text-xs text-amber-600">Not linked to a seeded hole — can’t save.</Text>
            )}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <PrimaryButton label="Approve" onPress={() => decide(i, true)} disabled={!s.holeId} />
              </View>
              <View className="flex-1">
                <Text
                  accessibilityRole="button"
                  onPress={() => decide(i, false)}
                  className="rounded-xl border border-slate-300 py-3 text-center text-slate-600"
                >
                  Reject
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      <View className="h-2" />
      <PrimaryButton label="Done" onPress={() => router.replace('/')} />
      <View className="h-6" />
    </ScrollView>
  );
}

const LABELS: Record<SuggestedUpdate['kind'], string> = {
  preferredTeeClub: 'Preferred tee club',
  poorClubs: 'Underperforming club',
  safeMissZones: 'Safe miss zone',
  leaveZones: 'Preferred leave',
};
