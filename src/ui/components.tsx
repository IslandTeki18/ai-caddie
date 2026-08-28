import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';

/** Placeholder color must be passed as a prop — NativeWind can't style RN placeholders. */
const PLACEHOLDER = '#5E675F'; // fg-dim

/**
 * Dark scrollable page shell. `footer` renders pinned below the scroll area
 * (in-round action buttons stay reachable without scrolling).
 */
export function Screen(props: { children: ReactNode; footer?: ReactNode }): ReactNode {
  return (
    <View className="flex-1 bg-ink">
      <ScrollView className="flex-1" contentContainerClassName="p-5" keyboardShouldPersistTaps="handled">
        {props.children}
      </ScrollView>
      {props.footer ? <View className="px-5 pb-[26px] pt-2">{props.footer}</View> : null}
    </View>
  );
}

/** 11px uppercase tracked label used above cards and values. */
export function Eyebrow(props: { children: ReactNode; className?: string }): ReactNode {
  return (
    <Text className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted ${props.className ?? ''}`}>
      {props.children}
    </Text>
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

/**
 * Single-select segmented control shared by every option-picking screen.
 * `row` lays options out as one equal-flex row (one thumb sweep) instead of
 * wrapping chips; `large` raises the target from 44 to 52pt for in-round use.
 */
export function Segmented<T extends string>(props: {
  label?: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  row?: boolean;
  large?: boolean;
}): ReactNode {
  return (
    <View className="mb-4">
      {props.label ? <Text className="mb-1.5 text-sm font-semibold text-fg-muted">{props.label}</Text> : null}
      <View className={`flex-row gap-2 ${props.row ? '' : 'flex-wrap'}`}>
        {props.options.map((opt) => {
          const active = opt === props.value;
          return (
            <Pressable
              key={opt}
              accessibilityRole="button"
              accessibilityLabel={props.label ? `${props.label}: ${opt}` : opt}
              accessibilityState={{ selected: active }}
              onPress={() => props.onChange(opt)}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
              // min-h-11 ≈ 44pt Apple minimum tap target — logged mid-round with a glove on.
              className={`items-center justify-center border px-3.5 py-2 ${props.large ? 'min-h-[52px] rounded-[14px]' : 'min-h-11 min-w-11 rounded-xl'} ${props.row ? 'flex-1' : ''} ${active ? 'border-accent bg-accent' : 'border-line bg-surface'}`}
            >
              <Text className={`text-base ${active ? 'font-semibold text-accent-ink' : 'text-fg-muted'}`}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Labeled full-width action button. `outline` swaps the accent fill for a
 * `surface` + `line` secondary; `large` is the 56–60pt in-round footer size.
 */
export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
  large?: boolean;
}): ReactNode {
  const bg = props.disabled ? 'bg-surface-2' : props.outline ? 'border border-line bg-surface' : 'bg-accent';
  const fg = props.disabled ? 'text-fg-dim' : props.outline ? 'font-bold text-fg' : 'font-extrabold text-accent-ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: props.disabled ?? false }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
      className={`justify-center px-4 ${props.large ? 'min-h-[58px] rounded-[18px] py-3' : 'mt-2 min-h-11 rounded-2xl py-3.5'} ${bg}`}
    >
      <Text className={`text-center ${props.large ? 'text-lg' : 'text-base'} font-bold ${fg}`}>{props.label}</Text>
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
