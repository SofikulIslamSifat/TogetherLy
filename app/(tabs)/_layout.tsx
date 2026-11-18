import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Home, ShoppingBasket, Utensils, CheckSquare, Images } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import { colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { user, loading, configured } = useAuth();
  const spaceQuery = useSpace(Boolean(user && configured));
  if (loading || (user && configured && spaceQuery.isLoading)) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 10 }}><ActivityIndicator color={colors.primaryPressed} /><Text style={{ color: colors.muted }}>Opening Togetherly…</Text></View>;
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!spaceQuery.data) return <Redirect href="/space" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primaryPressed, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: colors.border, height: 58 + insets.bottom, paddingBottom: Math.max(insets.bottom, 7), paddingTop: 7 }, tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }, tabBarItemStyle: { paddingVertical: 1 } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
    <Tabs.Screen name="shopping" options={{ title: 'Shopping', tabBarIcon: ({ color, size }) => <ShoppingBasket color={color} size={size} /> }} />
    <Tabs.Screen name="meals" options={{ title: 'Meals', tabBarIcon: ({ color, size }) => <Utensils color={color} size={size} /> }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} /> }} />
    <Tabs.Screen name="memories" options={{ title: 'Memories', tabBarIcon: ({ color, size }) => <Images color={color} size={size} /> }} />
    <Tabs.Screen name="notifications" options={{ href: null }} />
  </Tabs>;
}
