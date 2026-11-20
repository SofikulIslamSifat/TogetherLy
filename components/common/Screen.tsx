import React from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';
import { useIsDesktop } from '@/lib/responsive';

type ScreenProps = ScrollViewProps & { maxContentWidth?: number };

export function Screen({ children, contentContainerStyle, maxContentWidth = 1360, ...props }: ScreenProps) {
  const isDesktop = useIsDesktop();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.desktopContent,
          isDesktop && { maxWidth: maxContentWidth },
          contentContainerStyle,
        ]}
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
  desktopContent: { width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 32 },
});
