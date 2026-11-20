import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Home } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { FormField } from '@/components/common/FormField';
import { createSpace, getApiErrorMessage } from '@/features/spaces/api';
import { spaceQueryKey } from '@/features/spaces/useSpace';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/constants/theme';

export default function CreateSpaceScreen() {
  const [name, setName] = useState('Our Space');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (name.trim().length < 2 || name.trim().length > 50) { setError('Choose a name between 2 and 50 characters.'); return; }
    setBusy(true); setError('');
    try { await createSpace(name); await queryClient.invalidateQueries({ queryKey: spaceQueryKey }); router.replace('/(tabs)'); }
    catch (e) { setError(getApiErrorMessage(e, 'Could not create your space.')); }
    finally { setBusy(false); }
  };
  return <Screen maxContentWidth={620} contentContainerStyle={styles.content}>
    <AppButton title="Back" variant="text" onPress={() => router.back()} />
    <View style={styles.icon}><Home color={colors.primaryPressed} size={27} /></View>
    <Text style={styles.title}>Create your space</Text>
    <Text style={styles.subtitle}>Give your shared space a name. You can invite the second member once it is created.</Text>
    <FormField label="Space name" value={name} onChangeText={setName} placeholder="e.g. Our little home" autoCapitalize="words" maxLength={50} />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <AppButton title={busy ? 'Creating…' : 'Create private space'} onPress={submit} disabled={busy} />
    {busy ? <ActivityIndicator color={colors.primaryPressed} /> : null}
    <Text style={styles.note}>You will become the owner. The database enforces the two-member limit.</Text>
  </Screen>;
}
const styles = StyleSheet.create({ content: { gap: 18, paddingTop: 18 }, icon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, title: { fontSize: 27, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted, marginBottom: 10 }, error: { color: colors.danger, fontSize: 13 }, note: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' } });
