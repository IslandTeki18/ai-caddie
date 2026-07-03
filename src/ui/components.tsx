import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

/** Single-select segmented control shared by every option-picking screen. */
export function Segmented<T extends string>(props: {
  label?: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}): ReactNode {
  return (
    <View className="mb-4">
      {props.label ? <Text className="mb-1 text-sm font-medium text-slate-600">{props.label}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {props.options.map((opt) => {
          const active = opt === props.value;
          return (
            <Pressable
              key={opt}
              accessibilityRole="button"
              accessibilityLabel={props.label ? `${props.label}: ${opt}` : opt}
              accessibilityState={{ selected: active }}
              onPress={() => props.onChange(opt)}
              // min-h-11 ≈ 44pt Apple minimum tap target — logged mid-round with a glove on.
              className={`min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 py-2 ${active ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300 bg-white'}`}
            >
              <Text className={active ? 'text-emerald-700' : 'text-slate-700'}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Labeled full-width primary action button. */
export function PrimaryButton(props: { label: string; onPress: () => void; disabled?: boolean }): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: props.disabled ?? false }}
      disabled={props.disabled}
      onPress={props.onPress}
      className={`mt-2 min-h-11 justify-center rounded-xl px-4 py-3 ${props.disabled ? 'bg-slate-300' : 'bg-emerald-600'}`}
    >
      <Text className="text-center text-base font-semibold text-white">{props.label}</Text>
    </Pressable>
  );
}

/** Field wrapper: label above an arbitrary input. */
export function Field(props: { label: string; children: ReactNode }): ReactNode {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-slate-600">{props.label}</Text>
      {props.children}
    </View>
  );
}
