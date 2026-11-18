import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/AuthProvider';
export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
