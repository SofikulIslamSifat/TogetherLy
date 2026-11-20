import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/common/AppButton';
import { Screen } from '@/components/common/Screen';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/query-client';
export default function ProfileScreen() {
  const { user, signOut } = useAuth(); const [busy, setBusy] = useState(false);
  const name = user?.user_metadata?.display_name || 'Togetherly member';
  const logout = async () => { setBusy(true); try { await signOut(); queryClient.clear(); router.replace('/(auth)/login'); } catch (e) { Alert.alert('Could not sign out', e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); } };
  return <Screen contentContainerStyle={styles.content}><Text style={styles.title}>Your profile</Text><View style={styles.card}><View style={styles.avatar}><Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text></View><Text style={styles.name}>{name}</Text><Text style={styles.email}>{user?.email}</Text></View><Text style={styles.note}>Profile editing and private avatar uploads will be added in a later phase. Your account is managed securely by Supabase Auth.</Text><AppButton title="Sign out" variant="secondary" loading={busy} onPress={logout} /></Screen>;
}
const styles = StyleSheet.create({ content: { gap: 20 }, title: { color: colors.text, fontSize: 27, fontWeight: '800' }, card: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 8 }, avatar: { width: 70, height: 70, borderRadius: 24, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.primaryPressed, fontSize: 26, fontWeight: '800' }, name: { color: colors.text, fontSize: 17, fontWeight: '700' }, email: { color: colors.muted, fontSize: 13 }, note: { color: colors.muted, fontSize: 13, lineHeight: 20 } });
