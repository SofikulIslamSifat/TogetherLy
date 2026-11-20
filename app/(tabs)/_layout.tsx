import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, Redirect, router, usePathname } from 'expo-router';
import { CalendarDays, CheckSquare, Home, Images, ShoppingBasket, UserRound, Utensils } from 'lucide-react-native';
import { AppLogo } from '@/components/common/AppLogo';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import { colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsDesktop } from '@/lib/responsive';

const navigationItems = [
  { href: '/(tabs)' as const, label: 'Home', Icon: Home },
  { href: '/shopping' as const, label: 'Shopping', Icon: ShoppingBasket },
  { href: '/meals' as const, label: 'Meals', Icon: Utensils },
  { href: '/tasks' as const, label: 'Tasks', Icon: CheckSquare },
  { href: '/calendar' as const, label: 'Calendar', Icon: CalendarDays },
  { href: '/memories' as const, label: 'Memories', Icon: Images },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const { user, loading, configured } = useAuth();
  const spaceQuery = useSpace(Boolean(user && configured));
  if (loading || (user && configured && spaceQuery.isLoading)) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 10 }}><ActivityIndicator color={colors.primaryPressed} /><Text style={{ color: colors.muted }}>Opening Togetherly…</Text></View>;
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!spaceQuery.data) return <Redirect href="/space" />;
  return <View style={styles.layout}>
    {isDesktop ? <View style={[styles.sidebar, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <AppLogo layout="horizontal" tone="soft" style={styles.brand} />
      <View style={styles.navigation}>
        {navigationItems.map(({ href, label, Icon }) => {
          const active = href === '/(tabs)' ? pathname === '/' || pathname === '/(tabs)' : pathname === href;
          return <Pressable key={href} accessibilityRole="link" accessibilityState={{ selected: active }} onPress={() => router.push(href)} style={[styles.navigationItem, active && styles.navigationItemActive]}>
            <Icon size={19} color={active ? colors.primaryPressed : colors.muted} />
            <Text style={[styles.navigationLabel, active && styles.navigationLabelActive]}>{label}</Text>
          </Pressable>;
        })}
      </View>
      <View style={styles.sidebarFooter}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/profile')} style={[styles.navigationItem, pathname === '/profile' && styles.navigationItemActive]}>
          <UserRound size={19} color={pathname === '/profile' ? colors.primaryPressed : colors.muted} />
          <Text style={[styles.navigationLabel, pathname === '/profile' && styles.navigationLabelActive]}>Profile</Text>
        </Pressable>
      </View>
    </View> : null}
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primaryPressed, tabBarInactiveTintColor: colors.muted, tabBarStyle: isDesktop ? { display: 'none' } : { backgroundColor: '#FFFFFF', borderTopColor: colors.border, height: 58 + insets.bottom, paddingBottom: Math.max(insets.bottom, 7), paddingTop: 7 }, tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }, tabBarItemStyle: { paddingVertical: 1 } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
    <Tabs.Screen name="shopping" options={{ title: 'Shopping', tabBarIcon: ({ color, size }) => <ShoppingBasket color={color} size={size} /> }} />
    <Tabs.Screen name="meals" options={{ title: 'Meals', tabBarIcon: ({ color, size }) => <Utensils color={color} size={size} /> }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} /> }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }} />
    <Tabs.Screen name="memories" options={{ title: 'Memories', tabBarIcon: ({ color, size }) => <Images color={color} size={size} /> }} />
    </Tabs>
  </View>;
}

const styles = StyleSheet.create({
  layout: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  sidebar: { width: 248, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: colors.border, paddingHorizontal: 18 },
  brand: { paddingHorizontal: 8, marginBottom: 30 },
  navigation: { gap: 5 },
  navigationItem: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 13 },
  navigationItemActive: { backgroundColor: colors.secondaryBackground },
  navigationLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  navigationLabelActive: { color: colors.primaryPressed, fontWeight: '700' },
  sidebarFooter: { marginTop: 'auto', gap: 5, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
