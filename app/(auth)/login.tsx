import React, { useState } from 'react';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { AppButton } from '@/components/common/AppButton';
import { FormField } from '@/components/common/FormField';
import { Screen } from '@/components/common/Screen';
import { colors, radius } from '@/constants/theme';
import { loginSchema, type LoginValues } from '@/lib/validations/auth';
import { useAuth } from '@/features/auth/AuthProvider';
export default function LoginScreen() {
  const { signIn, configured } = useAuth(); const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const submit = async (values: LoginValues) => { setSubmitting(true); try { await signIn(values.email, values.password); } catch (e) { Alert.alert('Unable to sign in', e instanceof Error ? e.message : 'Please try again.'); } finally { setSubmitting(false); } };
  return <Screen contentContainerStyle={styles.content}>
    <View style={styles.brand}><View style={styles.mark}><Heart size={23} color="#FFFFFF" fill="#FFFFFF" /></View><Text style={styles.brandName}>Togetherly</Text><Text style={styles.tagline}>A little life, shared together.</Text></View>
    <View style={styles.intro}><Text style={styles.heading}>Welcome back</Text><Text style={styles.subheading}>Sign in to pick up where you left off.</Text></View>
    {!configured ? <View style={styles.notice}><Text style={styles.noticeTitle}>Supabase setup required</Text><Text style={styles.noticeText}>Copy .env.example to .env and add your Supabase project URL and publishable key. Authentication is disabled until configured.</Text></View> : null}
    <View style={styles.form}>
      <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => <FormField label="Email address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />} />
      <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => <FormField label="Password" placeholder="Enter your password" secureTextEntry value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />} />
      <Link href="/(auth)/forgot-password" style={styles.forgot}>Forgot password?</Link>
      <AppButton title="Sign in" loading={submitting} disabled={!configured} onPress={handleSubmit(submit)} />
    </View>
    <View style={styles.footer}><Text style={styles.footerText}>New to Togetherly? </Text><Link href="/(auth)/register" style={styles.link}>Create an account</Link></View>
  </Screen>;
}
const styles = StyleSheet.create({ content: { justifyContent: 'center', paddingTop: 38, paddingBottom: 32 }, brand: { alignItems: 'center', marginBottom: 44 }, mark: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, brandName: { fontSize: 27, fontWeight: '800', color: colors.text, letterSpacing: -0.8 }, tagline: { color: colors.muted, fontSize: 13, marginTop: 4 }, intro: { marginBottom: 25 }, heading: { fontSize: 27, fontWeight: '800', color: colors.text, letterSpacing: -0.7 }, subheading: { color: colors.muted, marginTop: 7, fontSize: 14 }, form: { gap: 17 }, forgot: { color: colors.primaryPressed, textAlign: 'right', fontWeight: '600', fontSize: 13, marginTop: -5 }, footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 }, footerText: { color: colors.muted, fontSize: 13 }, link: { color: colors.primaryPressed, fontWeight: '700', fontSize: 13 }, notice: { backgroundColor: colors.secondaryBackground, padding: 14, borderRadius: radius.md, marginBottom: 18, gap: 4 }, noticeTitle: { fontWeight: '700', color: colors.text, fontSize: 13 }, noticeText: { color: colors.muted, fontSize: 12, lineHeight: 18 } });
