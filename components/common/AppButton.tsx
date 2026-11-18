import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { colors, radius } from '@/constants/theme';

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
};

export function AppButton({ title, loading, disabled, variant = 'primary', style, accessibilityLabel, ...props }: Props) {
  const unavailable = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: unavailable, busy: Boolean(loading) }}
      disabled={unavailable}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !unavailable && styles.pressed,
        unavailable && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.text} />
      ) : (
        <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel, variant === 'text' && styles.textLabel]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.secondaryBackground, borderWidth: 1, borderColor: colors.border },
  text: { backgroundColor: 'transparent', minHeight: 44, paddingHorizontal: 12 },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  secondaryLabel: { color: colors.text },
  textLabel: { color: colors.primaryPressed },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.52 },
});
