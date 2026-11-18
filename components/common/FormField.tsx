import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius } from '@/constants/theme';

type Props = TextInputProps & { label: string; error?: string };

export function FormField({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.focus}
        underlineColorAndroid="transparent"
        style={[styles.input, error && styles.invalid, style]}
        accessibilityLabel={label}
        accessibilityHint={error ? `Error: ${error}` : undefined}
        {...props}
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.inputBackground, paddingHorizontal: 15, color: colors.text, fontSize: 15 },
  invalid: { borderColor: colors.danger, backgroundColor: '#FFFAFA' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17 },
});
