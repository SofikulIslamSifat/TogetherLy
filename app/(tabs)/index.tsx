import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { UserRound, Users, Settings, Bell } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import { useUnreadNotificationsCount } from '@/features/spaces/useNotifications';
import { createSpaceInvitation } from '@/features/spaces/api';
export default function HomeScreen() {
  const { user } = useAuth();
  const { data: space } = useSpace(Boolean(user));
  const unreadQuery = useUnreadNotificationsCount(user?.id);
  const unreadNotifications = unreadQuery.data ?? 0;
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there';
  const partner = space?.members.find((member) => member.user_id !== user?.id);
  const invite = async () => {
    if (!space) return;
    setInviteBusy(true); setInviteError('');
    try {
      const token = await createSpaceInvitation(space.id);
      const link = `togetherly://space/join?token=${token}`;
      await Share.share({ message: `Join my Togetherly space “${space.name}”. Open this invitation in Togetherly: ${link}\n\nThis invitation expires in 7 days and can only be used once.` });
    } catch (e) { setInviteError(e instanceof Error ? e.message : 'Could not create an invitation.'); }
    finally { setInviteBusy(false); }
  };
  return <Screen contentContainerStyle={styles.content}>
    <View style={styles.top}><View><Text style={styles.date}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text><Text style={styles.greeting}>Hello, {displayName}</Text></View><View style={styles.headerActions}><Link href="/notifications" style={styles.profile} accessibilityLabel="Notifications"><Bell size={20} color={colors.text} />{unreadNotifications > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text></View>}</Link><Link href="/profile" style={styles.profile}><UserRound size={21} color={colors.text} /></Link></View></View>
    <View style={styles.hero}><Text style={styles.heroTitle}>A little life, shared together.</Text><Text style={styles.heroText}>Your private space for the everyday things you share.</Text><View style={styles.people}><View style={styles.avatar}><UserRound size={20} color={colors.primaryPressed} /></View><Text style={styles.waiting}>{space?.name ?? 'Your shared space'}</Text></View></View>
    <Text style={styles.section}>Your space</Text>
    <View style={styles.spaceCard}>
      <View style={styles.spaceHeading}><View style={styles.spaceIcon}><Users size={19} color={colors.primaryPressed} /></View><View style={{ flex: 1 }}><Text style={styles.spaceName}>{space?.name ?? 'Loading your space…'}</Text><Text style={styles.spaceMeta}>{space?.members.length ?? 0} of 2 members · {space?.role === 'owner' ? 'Owner' : 'Member'}</Text></View></View>
      {space?.members.map((member) => <View key={member.user_id} style={styles.member}><View style={styles.memberAvatar}><UserRound size={17} color={colors.primaryPressed} /></View><View style={{ flex: 1 }}><Text style={styles.memberName}>{member.profile?.display_name ?? 'Togetherly member'}</Text><Text style={styles.memberRole}>{member.role === 'owner' ? 'Space owner' : 'Member'}</Text></View></View>)}
      {space && space.members.length < 2 && space.role === 'owner' ? <><AppButton title={inviteBusy ? 'Preparing invitation…' : 'Invite the second member'} onPress={invite} disabled={inviteBusy} /><Text style={styles.inviteHint}>A private, single-use invitation will be shared from your device.</Text></> : null}
      {space && !partner ? <Text style={styles.emptyText}>Your space is ready. Invite the other member to start sharing things together.</Text> : null}
      {inviteError ? <Text style={styles.error}>{inviteError}</Text> : null}
    </View>
    <View style={styles.quick}><Text style={styles.section}>Quick access</Text><Link href="/profile" style={styles.setting}><Settings size={18} color={colors.muted} /><Text style={styles.settingText}>Profile and account settings</Text></Link></View>
  </Screen>;
}
const styles = StyleSheet.create({ content: { gap: 20 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, badge: { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }, badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' }, date: { color: colors.muted, fontSize: 12 }, greeting: { color: colors.text, fontSize: 25, fontWeight: '800', marginTop: 4 }, profile: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, hero: { backgroundColor: colors.secondaryBackground, borderRadius: radius.lg, padding: 22, gap: 9 }, heroTitle: { color: colors.text, fontSize: 20, fontWeight: '800', maxWidth: 250 }, heroText: { color: colors.muted, fontSize: 13, lineHeight: 19 }, people: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10 }, avatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, waiting: { color: colors.text, fontSize: 12, fontWeight: '600' }, section: { color: colors.text, fontSize: 16, fontWeight: '800' }, spaceCard: { backgroundColor: '#FFFFFF', padding: 17, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: 13 }, spaceHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 }, spaceIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' }, spaceName: { color: colors.text, fontWeight: '800', fontSize: 15 }, spaceMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }, memberAvatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' }, memberName: { color: colors.text, fontWeight: '600', fontSize: 13 }, memberRole: { color: colors.muted, fontSize: 11, marginTop: 2 }, inviteHint: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' }, emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18 }, error: { color: colors.danger, fontSize: 12 }, quick: { gap: 12 }, setting: { backgroundColor: '#FFFFFF', borderRadius: radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, settingText: { color: colors.text, fontSize: 13, fontWeight: '600' } });
