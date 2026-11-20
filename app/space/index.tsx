import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { ArrowRight, LockKeyhole, Users } from 'lucide-react-native';
import { AppLogo } from '@/components/common/AppLogo';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import { colors, radius } from '@/constants/theme';

export default function SpaceLandingScreen() {
  const { user, loading: authLoading, configured } = useAuth();
  const { data: space, isLoading, error } = useSpace(Boolean(user && configured));
  if (authLoading || (user && configured && isLoading)) return <View style={styles.loading}><ActivityIndicator color={colors.primaryPressed} /><Text style={styles.muted}>Checking your private space…</Text></View>;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (space) return <Redirect href="/(tabs)" />;

  return <Screen maxContentWidth={620} contentContainerStyle={styles.content}>
    <AppLogo tone="soft" style={styles.brand} />
    <View style={styles.hero}><Text style={styles.heading}>Your shared space starts here.</Text><Text style={styles.description}>Create a private space for two, or join someone who has invited you. Your lists, plans and memories stay between the members.</Text></View>
    <View style={styles.info}><LockKeyhole color={colors.success} size={20} /><Text style={styles.infoText}>Private by design. Only two accounts can belong to a space.</Text></View>
    <AppButton title="Create a new space" onPress={() => router.push('/space/create')} />
    <AppButton title="Join with an invitation" variant="secondary" onPress={() => router.push('/space/join')} />
    {error ? <Text style={styles.error}>{error.message}</Text> : null}
    <View style={styles.footer}><Users color={colors.muted} size={16} /><Text style={styles.muted}>One space. Two members. Shared everyday life.</Text><ArrowRight color={colors.muted} size={16} /></View>
  </Screen>;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background }, content: { justifyContent: 'center', gap: 16, paddingTop: 40, paddingBottom: 40 }, brand: { marginBottom: 20 }, hero: { gap: 10, marginBottom: 8 }, heading: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '800', textAlign: 'center' }, description: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center' }, info: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF5EF', padding: 14, borderRadius: radius.md, marginBottom: 8 }, infoText: { color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 }, footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }, muted: { color: colors.muted, fontSize: 13 }, error: { color: colors.danger, textAlign: 'center' } });
