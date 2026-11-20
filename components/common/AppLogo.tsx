import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors } from '@/constants/theme';

type AppLogoProps = {
  layout?: 'stacked' | 'horizontal';
  tone?: 'primary' | 'soft';
  style?: StyleProp<ViewStyle>;
};

export function AppLogo({ layout = 'stacked', tone = 'primary', style }: AppLogoProps) {
  const horizontal = layout === 'horizontal';
  const markSize = horizontal ? 34 : 54;
  return (
    <View style={[horizontal ? styles.horizontal : styles.stacked, style]}>
      <View style={[
        styles.mark,
        !horizontal && styles.stackedMark,
        { width: markSize, height: markSize, borderRadius: horizontal ? 12 : 18 },
        tone === 'soft' && styles.softMark,
      ]}>
        <Heart
          size={horizontal ? 18 : 23}
          color={tone === 'soft' ? colors.primaryPressed : '#FFFFFF'}
          fill={tone === 'soft' ? colors.primary : '#FFFFFF'}
        />
      </View>
      <View style={horizontal ? styles.horizontalCopy : styles.stackedCopy}>
        <Text style={[styles.name, horizontal ? styles.smallName : styles.largeName]}>Togetherly</Text>
        {!horizontal ? <Text style={styles.tagline}>A little life, shared together.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stacked: { alignItems: 'center' },
  horizontal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  stackedMark: { marginBottom: 12 },
  softMark: { backgroundColor: colors.secondaryBackground },
  stackedCopy: { alignItems: 'center' },
  horizontalCopy: { justifyContent: 'center' },
  name: { color: colors.text, fontWeight: '800' },
  largeName: { fontSize: 27, letterSpacing: -0.8 },
  smallName: { fontSize: 19, letterSpacing: -0.5 },
  tagline: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
