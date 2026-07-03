import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import type { ShotLog } from '@/core';
import { useSessionContext } from '@/ui/session-provider';
import { shotFromResult } from '@/ui/round-form';
import { Screen, CenteredScreen, Header, PrimaryButton, LinkText } from '@/ui/components';
import { ShotLogGrid } from '@/ui/shot-log-grid';

/** Shot Logging screen (step 25): grid → LOG_SHOT → next shot / complete hole. */
export default function LogScreen() {
  const { state, dispatch } = useSessionContext();
  const [logged, setLogged] = useState(false);

  if (!state) {
    return (
      <CenteredScreen>
        <Text className="text-fg-muted">No shot in progress.</Text>
      </CenteredScreen>
    );
  }

  const onLog = async (result: Omit<ShotLog, 'timestamp'>) => {
    const shot = shotFromResult(state, { ...result, timestamp: Date.now() }, Date.now());
    await dispatch({ type: 'LOG_SHOT', shot });
    setLogged(true);
  };

  const completeHole = async () => {
    await dispatch({ type: 'COMPLETE_HOLE' });
    await dispatch({ type: 'NEXT_HOLE' });
    router.replace('/hole');
  };

  return (
    <Screen>
      <Header eyebrow="Log" title="Result" />
      <ShotLogGrid onLog={onLog} disabled={logged} />

      {logged ? (
        <View className="mt-4">
          <PrimaryButton label="Next shot" onPress={() => router.replace({ pathname: '/shot', params: { kind: 'approach' } })} />
          <View className="h-3" />
          <LinkText label="Complete hole →" onPress={completeHole} />
        </View>
      ) : null}
      <View className="h-6" />
    </Screen>
  );
}
