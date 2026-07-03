import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';

/** Placeholder color must be passed as a prop — NativeWind can't style RN placeholders. */
const PLACEHOLDER = '#5E675F'; // fg-dim

/** Dark scrollable page shell. Replaces the repeated `bg-white p-6` per screen. */
export function Screen(props: { children: ReactNode }): ReactNode {
  return (
    <ScrollView className="flex-1 bg-ink" contentContainerClassName="p-6" keyboardShouldPersistTaps="handled">
      {props.children}
    </ScrollView>
  );
}

/** Centered dark container for empty / loading states. */
export function CenteredScreen(props: { children: ReactNode }): ReactNode {
  return <View className="flex-1 items-center justify-center gap-3 bg-ink p-6">{props.children}</View>;
}

/** Screen heading: optional uppercase eyebrow over a large bold title, optional live dot. */
export function Header(props: { title: string; eyebrow?: string; live?: boolean }): ReactNode {
  return (
    <View className="mb-6">
      {props.eyebrow ? (
        <Text className="mb-1 text-xs font-semibold uppercase tracking-widest text-fg-muted">{props.eyebrow}</Text>
      ) : null}
      <View className="flex-row items-center gap-2">
        <Text className="text-3xl font-bold text-fg">{props.title}</Text>
        {props.live ? (
          <View className="flex-row items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5">
            <View className="h-1.5 w-1.5 rounded-full bg-accent" />
            <Text className="text-xs font-semibold uppercase tracking-wide text-accent">live</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Surface card with an optional title. */
export function Card(props: { title?: string; children: ReactNode }): ReactNode {
  return (
    <View className="mb-4 rounded-2xl border border-line bg-surface p-5">
      {props.title ? <Text className="mb-3 text-base font-semibold text-fg">{props.title}</Text> : null}
      {props.children}
    </View>
  );
}

/** Single-select segmented control shared by every option-picking screen. */
export function Segmented<T extends string>(props: {
  label?: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}): ReactNode {
  return (
    <View className="mb-4">
      {props.label ? <Text className="mb-1.5 text-sm font-medium text-fg-muted">{props.label}</Text> : null}
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
              className={`min-h-11 min-w-11 items-center justify-center rounded-xl border px-3.5 py-2 ${active ? 'border-accent bg-accent' : 'border-line bg-surface'}`}
            >
              <Text className={`text-base ${active ? 'font-semibold text-accent-ink' : 'text-fg-muted'}`}>{opt}</Text>
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
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
      className={`mt-2 min-h-11 justify-center rounded-2xl px-4 py-3.5 ${props.disabled ? 'bg-surface-2' : 'bg-accent'}`}
    >
      <Text className={`text-center text-base font-bold ${props.disabled ? 'text-fg-dim' : 'text-accent-ink'}`}>
        {props.label}
      </Text>
    </Pressable>
  );
}

/** Text link styled in the accent color (replaces inline emerald link Texts). */
export function LinkText(props: { label: string; onPress: () => void; className?: string }): ReactNode {
  return (
    <Text
      accessibilityRole="link"
      onPress={props.onPress}
      className={`text-center font-medium text-accent ${props.className ?? ''}`}
    >
      {props.label}
    </Text>
  );
}

/** Field wrapper: label above an arbitrary input. */
export function Field(props: { label: string; children: ReactNode }): ReactNode {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-fg-muted">{props.label}</Text>
      {props.children}
    </View>
  );
}

/** Themed labeled text input. Dedupes the inline TextInput blocks across screens. */
export function TextField(props: { label: string } & TextInputProps): ReactNode {
  const { label, ...input } = props;
  return (
    <Field label={label}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={PLACEHOLDER}
        {...input}
        className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg"
      />
    </Field>
  );
}
