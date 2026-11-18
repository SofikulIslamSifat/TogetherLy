import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppButton } from '@/components/common/AppButton';
import { FormField } from '@/components/common/FormField';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const schema = z.object({ password: z.string().min(8, 'Use at least 8 characters.') });
type Values = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const [sessionReady, setSessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '' } });

  useEffect(() => {
    let active = true;
    const acceptRecoveryUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const params = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken || params.get('type') !== 'recovery') return;
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
        if (active) setSessionReady(true);
      } catch (error) {
        if (active) Alert.alert('Invalid reset link', error instanceof Error ? error.message : 'Request a new password reset email.');
      }
    };
    Linking.getInitialURL().then(acceptRecoveryUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => { void acceptRecoveryUrl(url); });
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session && active) setSessionReady(true);
    });
    return () => { active = false; subscription.remove(); authSubscription.unsubscribe(); };
  }, []);

  const submit = async ({ password }: Values) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password updated', 'Your password has been changed.');
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Could not update password', error instanceof Error ? error.message : 'Request a new reset link and try again.');
    } finally { setSubmitting(false); }
  };

  return <Screen contentContainerStyle={styles.content}>
    <Text style={styles.title}>Choose a new password</Text>
    <Text style={styles.subtitle}>{sessionReady ? 'Enter a new password for your account.' : 'Open the password reset link from your email on this device to continue.'}</Text>
    {sessionReady ? <View style={styles.form}><Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => <FormField label="New password" placeholder="At least 8 characters" secureTextEntry value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />} /><AppButton title="Update password" loading={submitting} onPress={handleSubmit(submit)} /></View> : null}
  </Screen>;
}
const styles = StyleSheet.create({ content: { justifyContent: 'center', gap: 14 }, title: { color: colors.text, fontSize: 27, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 }, form: { gap: 18, marginTop: 15 } });
