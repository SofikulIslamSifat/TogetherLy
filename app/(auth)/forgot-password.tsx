import React, { useState } from 'react';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/common/AppButton';
import { FormField } from '@/components/common/FormField';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { resetSchema, type ResetValues } from '@/lib/validations/auth';
import { useAuth } from '@/features/auth/AuthProvider';
export default function ForgotPasswordScreen() {
  const { sendPasswordReset, configured } = useAuth(); const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { email: '' } });
  const submit = async ({ email }: ResetValues) => { setSubmitting(true); try { await sendPasswordReset(email); Alert.alert('Check your inbox', 'If the address is registered, a password reset link will be sent.'); } catch (e) { Alert.alert('Could not send reset email', e instanceof Error ? e.message : 'Please try again.'); } finally { setSubmitting(false); } };
  return <Screen maxContentWidth={520} contentContainerStyle={styles.content}><Text style={styles.heading}>Reset your password</Text><Text style={styles.subheading}>Enter the email address linked to your account. We’ll send a reset link if it is registered.</Text><View style={styles.form}><Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => <FormField label="Email address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />} /><AppButton title="Send reset link" loading={submitting} disabled={!configured} onPress={handleSubmit(submit)} /></View><Link href="/(auth)/login" style={styles.back}>Back to sign in</Link></Screen>;
}
const styles = StyleSheet.create({ content: { justifyContent: 'center' }, heading: { color: colors.text, fontSize: 28, fontWeight: '800' }, subheading: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 28 }, form: { gap: 20 }, back: { color: colors.primaryPressed, textAlign: 'center', marginTop: 26, fontWeight: '700' } });
