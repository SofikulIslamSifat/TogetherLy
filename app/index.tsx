import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/constants/theme';
export default function Index() {
  const { loading, user } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primaryPressed} /><Text style={styles.text}>Opening your shared space…</Text></View>;
  return <Redirect href={user ? '/space' : '/(auth)/login'} />;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background }, text: { color: colors.muted, fontSize: 14 } });
