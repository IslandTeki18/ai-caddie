import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { ShotLog } from '@/core';
import { useSessionContext } from '@/ui/session-provider';
import { shotFromResult } from '@/ui/round-form';
import { PrimaryButton } from '@/ui/components';
import { ShotLogGrid } from '@/ui/shot-log-grid';

/** Shot Logging screen (step 25): grid → LOG_SHOT → next shot / complete hole. */
export default function LogScreen() {
  const { state, dispatch } = useSessionContext();
  const [logged, setLogged] = useState(false);

  if (!state) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-slate-500">No shot in progress.</Text>
      </View>
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
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6">
      <Text className="mb-4 text-lg font-semibold text-slate-900">Log result</Text>
      <ShotLogGrid onLog={onLog} disabled={logged} />

      {logged ? (
        <View className="mt-4">
          <PrimaryButton label="Next shot" onPress={() => router.replace({ pathname: '/shot', params: { kind: 'approach' } })} />
          <View className="h-2" />
          <Text accessibilityRole="link" onPress={completeHole} className="text-center text-emerald-700">
            Complete hole →
          </Text>
        </View>
      ) : null}
      <View className="h-6" />
    </ScrollView>
  );
}
