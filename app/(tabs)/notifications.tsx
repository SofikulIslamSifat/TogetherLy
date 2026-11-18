import React from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCheck, ClipboardList, Image as ImageIcon, ShoppingBasket, Utensils } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { StateView } from '@/components/common/StateView';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNotifications, useUnreadNotificationsCount, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/features/spaces/useNotifications';
import type { ActivityNotification } from '@/features/spaces/notifications';

function ActivityIcon({ type }: { type: ActivityNotification['entity_type'] }) {
  const Icon = type === 'task' ? ClipboardList : type === 'shopping' ? ShoppingBasket : type === 'meal' ? Utensils : ImageIcon;
  return <View style={styles.iconCircle}><Icon size={19} color={colors.primaryPressed} /></View>;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const query = useNotifications(user?.id);
  const unreadQuery = useUnreadNotificationsCount(user?.id);
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up.'}</Text>
        </View>
        {unreadCount > 0 && <Pressable accessibilityRole="button" onPress={() => markAll.mutate()} disabled={markAll.isPending} style={styles.markAll}>
          <CheckCheck size={16} color={colors.primaryPressed} /><Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>}
      </View>

      {query.isLoading ? (
        <StateView loading title="Loading updates" description="Your shared activity will appear here." />
      ) : query.isError ? (
        <StateView title="Notifications could not be loaded" description={query.error.message} actionLabel="Try again" onAction={() => { void query.refetch(); }} />
      ) : !query.data?.length ? (
        <StateView icon={<Bell size={25} color={colors.primaryPressed} />} title="No updates yet" description="When your space partner adds a task, updates the shopping list, plans a meal or saves a memory, it will appear here." />
      ) : (
        <View style={styles.list}>
          {query.data.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => {
              if (!item.read_at) markOne.mutate(item.id);
              router.push(item.entity_type === 'task' ? '/tasks' : item.entity_type === 'shopping' ? '/shopping' : item.entity_type === 'meal' ? '/meals' : '/memories');
            }} style={[styles.notification, !item.read_at && styles.unread]}>
              <ActivityIcon type={item.entity_type} />
              <View style={styles.copy}>
                <View style={styles.titleRow}><Text style={styles.notificationTitle}>{item.title}</Text>{!item.read_at && <View style={styles.unreadDot} />}</View>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headingCopy: { flex: 1, gap: 5 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13 },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: colors.secondaryBackground, borderRadius: radius.pill },
  markAllText: { color: colors.primaryPressed, fontSize: 11, fontWeight: '700' },
  list: { gap: 10 },
  notification: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 15, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: '#E9C1CB', backgroundColor: '#FFFCFC' },
  iconCircle: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  notificationTitle: { color: colors.text, fontSize: 14, fontWeight: '800', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryPressed },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  time: { color: '#A99DA1', fontSize: 10, marginTop: 2 },
});
