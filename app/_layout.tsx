import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/constants/theme';
export default function RootLayout() {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><AuthProvider><StatusBar style="dark" backgroundColor={colors.background} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade' }} /></AuthProvider></QueryClientProvider></SafeAreaProvider>;
}
