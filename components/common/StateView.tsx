import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type ReactNode } from 'react-native';
import { AppButton } from '@/components/common/AppButton';
import { colors, radius, spacing } from '@/constants/theme';

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function StateView({ title, description, icon, loading = false, actionLabel, onAction, compact = false }: Props) {
  return (
    <View style={[styles.card, compact && styles.compact]} accessibilityLiveRegion="polite">
      {loading ? <ActivityIndicator size="small" color={colors.primaryPressed} /> : icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? <AppButton title={actionLabel} variant="secondary" onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  compact: { minHeight: 110, padding: spacing.lg },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryBackground },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
