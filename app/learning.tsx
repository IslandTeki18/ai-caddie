import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { suggestLearning, applyApprovedUpdate } from '@/session';
import type { SuggestedUpdate } from '@/engine';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, CenteredScreen, Header, Card, PrimaryButton } from '@/ui/components';

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
      <CenteredScreen>
        <Text className="text-fg-muted">No round to review.</Text>
      </CenteredScreen>
    );
  }

  return (
    <Screen>
      <Header eyebrow="Learning" title="What the round taught" />
      <Text className="-mt-4 mb-6 text-fg-muted">Approve to remember, reject to discard. Nothing changes on its own.</Text>

      {suggestions === undefined ? (
        <Text className="text-fg-dim">Scanning shots…</Text>
      ) : suggestions.length === 0 ? (
        <Text className="text-fg-dim">No new patterns crossed the confidence threshold.</Text>
      ) : (
        suggestions.map((s, i) => (
          <Card key={`${s.holeNumber}-${s.kind}`}>
            <Text className="text-xs uppercase tracking-wide text-fg-muted">Hole {s.holeNumber}</Text>
            <Text className="mb-1 text-base font-semibold text-fg">{LABELS[s.kind]}</Text>
            <Text className="mb-4 text-fg-muted">{s.rationale}</Text>
            {s.holeId ? null : (
              <Text className="mb-3 text-xs text-amber-300">Not linked to a seeded hole — can’t save.</Text>
            )}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <PrimaryButton label="Approve" onPress={() => decide(i, true)} disabled={!s.holeId} />
              </View>
              <View className="flex-1">
                <Text
                  accessibilityRole="button"
                  onPress={() => decide(i, false)}
                  className="mt-2 min-h-11 rounded-2xl border border-line py-3.5 text-center font-medium text-fg-muted"
                >
                  Reject
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}

      <View className="h-2" />
      <PrimaryButton label="Done" onPress={() => router.replace('/')} />
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
