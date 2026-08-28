import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { recentStartPattern, type StartPattern } from '@/session';
import { useSessionContext } from '@/ui/session-provider';
import { shotFromResult } from '@/ui/round-form';
import { Screen, CenteredScreen, Eyebrow, PrimaryButton } from '@/ui/components';
import { ShotLogGrid, useShotResult } from '@/ui/shot-log-grid';

const OPPOSITE = { left: 'right', right: 'left' } as const;
const ORDINAL = ['', 'first', 'second', 'third', 'fourth'] as const;

/** Log (2d): five rows → LOG_SHOT, reflection note when a pattern continues, next shot / hole done. */
export default function LogScreen() {
  const { state, dispatch } = useSessionContext();
  const [result, setResult] = useShotResult();
  const [logged, setLogged] = useState(false);

  if (!state) {
    return (
      <CenteredScreen>
        <Text className="text-fg-muted">No shot in progress.</Text>
      </CenteredScreen>
    );
  }

  const onLog = async () => {
    const shot = shotFromResult(state, { ...result, timestamp: Date.now() }, Date.now());
    await dispatch({ type: 'LOG_SHOT', shot });
    setLogged(true);
  };

  const completeHole = async () => {
    await dispatch({ type: 'COMPLETE_HOLE' });
    await dispatch({ type: 'NEXT_HOLE' });
    router.replace('/hole');
  };

  // Reflection only when the shot just logged continues a run of three or more.
  const pattern = logged ? recentStartPattern(state.shots) : undefined;
  const reflect = pattern && pattern.direction === state.shots[state.shots.length - 1]?.startDirection ? pattern : undefined;
  const club = state.currentShot?.club ?? state.shots[state.shots.length - 1]?.club;

  return (
    <Screen
      footer={
        <View className="flex-row gap-3">
          <View className="flex-1">
            {logged ? (
              <PrimaryButton large label="Next shot" onPress={() => router.replace({ pathname: '/shot', params: { kind: 'approach' } })} />
            ) : (
              <PrimaryButton large label="Log shot" onPress={onLog} />
            )}
          </View>
          <PrimaryButton large outline label="Hole done" onPress={completeHole} />
        </View>
      }
    >
      <View className="mb-5">
        <Eyebrow>
          Log · Hole {state.holeNumber}{club ? ` · ${club}` : ''}
        </Eyebrow>
        <Text className="text-[32px] font-extrabold text-fg">{logged ? 'Logged.' : 'What happened?'}</Text>
      </View>

      {logged ? null : <ShotLogGrid value={result} onChange={setResult} />}

      {reflect ? (
        <View className="rounded-2xl border border-line bg-surface px-4 py-3.5">
          <Text className="text-[13px] leading-5 text-fg-muted">{reflection(reflect)}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function reflection(p: StartPattern): string {
  const nth = ORDINAL[p.count] ?? `${p.count}th`;
  return `That's a ${nth} ${p.direction} start today. The next call will bias further ${OPPOSITE[p.direction]}.`;
}
