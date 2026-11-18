import React from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';

export function Screen({ children, contentContainerStyle, ...props }: ScrollViewProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
});
