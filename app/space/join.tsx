import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { FormField } from '@/components/common/FormField';
import { acceptSpaceInvitation, getApiErrorMessage } from '@/features/spaces/api';
import { spaceQueryKey } from '@/features/spaces/useSpace';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/constants/theme';

export default function JoinSpaceScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    const clean = token.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(clean)) { setError('Enter the 64-character invitation code shared with you.'); return; }
    setBusy(true); setError('');
    try { await acceptSpaceInvitation(clean); await queryClient.invalidateQueries({ queryKey: spaceQueryKey }); router.replace('/(tabs)'); }
    catch (e) { setError(getApiErrorMessage(e, 'Could not join this space.')); }
    finally { setBusy(false); }
  };
  return <Screen maxContentWidth={620} contentContainerStyle={styles.content}>
    <AppButton title="Back" variant="text" onPress={() => router.back()} />
    <View style={styles.icon}><KeyRound color={colors.primaryPressed} size={27} /></View>
    <Text style={styles.title}>Join a shared space</Text>
    <Text style={styles.subtitle}>Paste the invitation code you received from the space owner. Invitations are private, single-use and expire after seven days.</Text>
    <FormField label="Invitation code" value={token} onChangeText={setToken} placeholder="Paste invitation code" autoCapitalize="none" autoCorrect={false} multiline />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <AppButton title={busy ? 'Joining…' : 'Accept invitation'} onPress={submit} disabled={busy} />
    <Text style={styles.note}>Each account can belong to only one Togetherly space.</Text>
  </Screen>;
}
const styles = StyleSheet.create({ content: { gap: 18, paddingTop: 18 }, icon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, title: { fontSize: 27, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted, marginBottom: 10 }, error: { color: colors.danger, fontSize: 13, lineHeight: 19 }, note: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' } });
