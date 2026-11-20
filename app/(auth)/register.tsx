import React, { useState } from 'react';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/common/AppButton';
import { FormField } from '@/components/common/FormField';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { registerSchema, type RegisterValues } from '@/lib/validations/auth';
import { useAuth } from '@/features/auth/AuthProvider';
export default function RegisterScreen() {
  const { signUp, configured } = useAuth(); const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { displayName: '', email: '', password: '' } });
  const submit = async (values: RegisterValues) => { setSubmitting(true); try { const result = await signUp(values.displayName, values.email, values.password); Alert.alert('Account created', result.needsEmailConfirmation ? 'Check your email to confirm your account, then sign in.' : 'Your account is ready.'); } catch (e) { Alert.alert('Could not create account', e instanceof Error ? e.message : 'Please try again.'); } finally { setSubmitting(false); } };
  return <Screen maxContentWidth={520} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>GET STARTED</Text><Text style={styles.heading}>Make room for together.</Text><Text style={styles.subheading}>Create your account. You can set up your private space next.</Text>
    <View style={styles.form}>
      <Controller control={control} name="displayName" render={({ field: { onChange, onBlur, value } }) => <FormField label="Your name" placeholder="How should we call you?" autoCapitalize="words" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.displayName?.message} />} />
      <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => <FormField label="Email address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />} />
      <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => <FormField label="Password" placeholder="At least 8 characters" secureTextEntry value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />} />
      <AppButton title="Create account" loading={submitting} disabled={!configured} onPress={handleSubmit(submit)} />
      {!configured ? <Text style={styles.setup}>Add Supabase credentials to .env to enable account creation.</Text> : null}
    </View>
    <View style={styles.footer}><Text style={styles.footerText}>Already have an account? </Text><Link href="/(auth)/login" style={styles.link}>Sign in</Link></View>
  </Screen>;
}
const styles = StyleSheet.create({ content: { justifyContent: 'center' }, eyebrow: { color: colors.primaryPressed, fontWeight: '800', letterSpacing: 1.5, fontSize: 11, marginBottom: 12 }, heading: { color: colors.text, fontSize: 29, fontWeight: '800', letterSpacing: -0.8 }, subheading: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 30 }, form: { gap: 18 }, setup: { color: colors.muted, fontSize: 12, textAlign: 'center' }, footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 }, footerText: { color: colors.muted, fontSize: 13 }, link: { color: colors.primaryPressed, fontWeight: '700', fontSize: 13 } });
