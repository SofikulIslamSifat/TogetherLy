import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import { CalendarDays, Camera, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { AppButton } from '@/components/common/AppButton';
import { StateView } from '@/components/common/StateView';
import { Screen } from '@/components/common/Screen';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import {
  MEMORY_CATEGORIES, type MemoryCategory, type SharedMemory,
} from '@/features/spaces/memories';
import { useCreateMemory, useDeleteMemory, useMemories, useUpdateMemory } from '@/features/spaces/useMemories';

function today() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export default function MemoriesScreen() {
  const { user } = useAuth();
  const spaceQuery = useSpace();
  const spaceId = spaceQuery.data?.id;
  const memoriesQuery = useMemories(spaceId);
  const createMutation = useCreateMemory(spaceId ?? '');
  const updateMutation = useUpdateMemory(spaceId ?? '');
  const deleteMutation = useDeleteMemory(spaceId ?? '');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ImagePickerAsset | null>(null);
  const [editingMemory, setEditingMemory] = useState<SharedMemory | null>(null);
  const [caption, setCaption] = useState('');
  const [memoryDate, setMemoryDate] = useState(today());
  const [category, setCategory] = useState<MemoryCategory>('Everyday');
  const [pickerBusy, setPickerBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const members = useMemo(() => spaceQuery.data?.members ?? [], [spaceQuery.data?.members]);
  const memberName = (userId: string) => members.find((member) => member.user_id === userId)?.profile?.display_name ?? 'A member';

  const resetForm = () => {
    setSelectedAsset(null);
    setEditingMemory(null);
    setCaption('');
    setMemoryDate(today());
    setCategory('Everyday');
    setFormError('');
  };

  const openNewMemory = async () => {
    setFormError('');
    try {
      setPickerBusy(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo library access to add a memory.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85, base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      setSelectedAsset(result.assets[0]);
      setEditingMemory(null);
      setCaption('');
      setMemoryDate(today());
      setCategory('Everyday');
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Could not open photos', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPickerBusy(false);
    }
  };

  const openEditMemory = (memory: SharedMemory) => {
    setEditingMemory(memory);
    setSelectedAsset(null);
    setCaption(memory.caption ?? '');
    setMemoryDate(memory.memory_date);
    setCategory(memory.category);
    setFormError('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const saveMemory = async () => {
    if (!validDate(memoryDate)) {
      setFormError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    setFormError('');
    try {
      if (editingMemory) {
        await updateMutation.mutateAsync({ id: editingMemory.id, caption, memoryDate, category });
      } else {
        if (!spaceId || !selectedAsset) return;
        await createMutation.mutateAsync({ caption, memoryDate, category, asset: selectedAsset });
      }
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The memory could not be saved.');
    }
  };

  const confirmDelete = (memory: SharedMemory) => {
    Alert.alert('Delete this memory?', 'The photo and its caption will be removed from your shared gallery.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate(memory, {
          onError: (error) => Alert.alert('Could not delete memory', error.message),
        });
      } },
    ]);
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Memories</Text>
          <Text style={styles.subtitle}>A shared place for the moments you want to keep.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Add a memory" onPress={openNewMemory} disabled={pickerBusy} style={styles.addButton}>
          {pickerBusy ? <ActivityIndicator color="#FFFFFF" /> : <Plus color="#FFFFFF" size={22} />}
        </Pressable>
      </View>

      {memoriesQuery.isLoading ? (
        <StateView loading title="Loading your memories" description="Opening your shared photo gallery." />
      ) : memoriesQuery.isError ? (
        <StateView title="Memories could not be loaded" description={memoriesQuery.error.message} actionLabel="Try again" onAction={() => { void memoriesQuery.refetch(); }} />
      ) : (memoriesQuery.data?.length ?? 0) === 0 ? (
        <StateView icon={<ImagePlus color={colors.primaryPressed} size={27} />} title="Your gallery starts here" description="Add a photo from your library and keep the date and story with it. Both space members can see shared memories." actionLabel={pickerBusy ? 'Opening photo library…' : 'Add your first memory'} onAction={openNewMemory} />
      ) : (
        <View style={styles.gallery}>
          {memoriesQuery.data?.map((memory) => (
            <View key={memory.id} style={styles.memoryCard}>
              <Image source={{ uri: memory.signed_url }} style={styles.memoryImage} resizeMode="contain" />
              <View style={styles.memoryBody}>
                <View style={styles.memoryMetaRow}>
                  <Text style={styles.categoryTag}>{memory.category}</Text>
                  <View style={styles.dateRow}><CalendarDays color={colors.muted} size={13} /><Text style={styles.dateText}>{memory.memory_date}</Text></View>
                </View>
                {!!memory.caption && <Text style={styles.caption}>{memory.caption}</Text>}
                <View style={styles.footerRow}>
                  <Text style={styles.creator}>Added by {memberName(memory.created_by)}</Text>
                  {memory.created_by === user?.id && (
                    <View style={styles.actions}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Edit memory" onPress={() => openEditMemory(memory)} style={styles.iconButton}><Pencil color={colors.muted} size={17} /></Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel="Delete memory" onPress={() => confirmDelete(memory)} style={styles.iconButton}><Trash2 color={colors.danger} size={17} /></Pressable>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>{editingMemory ? 'Edit memory' : 'New memory'}</Text><Text style={styles.modalSubtitle}>{editingMemory ? 'Update the details for this moment.' : 'Add a caption and a date for your photo.'}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={closeModal} style={styles.closeButton}><X color={colors.muted} size={21} /></Pressable>
            </View>
            {selectedAsset ? <Image source={{ uri: selectedAsset.uri }} style={styles.previewImage} resizeMode="contain" /> : editingMemory ? <Image source={{ uri: editingMemory.signed_url }} style={styles.previewImage} resizeMode="contain" /> : null}
            <Text style={styles.fieldLabel}>Caption</Text>
            <TextInput value={caption} onChangeText={setCaption} placeholder="Write a little about this moment…" placeholderTextColor="#A99DA1" multiline maxLength={500} style={[styles.input, styles.captionInput]} />
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput value={memoryDate} onChangeText={setMemoryDate} placeholder="2026-11-18" placeholderTextColor="#A99DA1" autoCapitalize="none" style={styles.input} />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryChoices}>
              {MEMORY_CATEGORIES.map((item) => (
                <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChoice, category === item && styles.categoryChoiceActive]}>
                  <Text style={[styles.categoryChoiceText, category === item && styles.categoryChoiceTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            {!!formError && <Text style={styles.errorText}>{formError}</Text>}
            <AppButton title={editingMemory ? 'Save changes' : 'Save memory'} onPress={saveMemory} loading={busy} disabled={!editingMemory && !selectedAsset} />
            {!editingMemory && <View style={styles.photoHint}><Camera color={colors.muted} size={14} /><Text style={styles.photoHintText}>JPEG, PNG, WebP or HEIC · up to 10 MB</Text></View>}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, gap: 5 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  addButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primaryPressed, alignItems: 'center', justifyContent: 'center' },
  state: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  stateCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 22, gap: 12, borderWidth: 1, borderColor: colors.border },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 24, alignItems: 'center', gap: 13, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  emptyIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 18, textAlign: 'center' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 },
  memoryCard: { width: '49%', backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  memoryImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.secondaryBackground },
  memoryBody: { padding: 15, gap: 10 },
  memoryMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  categoryTag: { color: colors.primaryPressed, backgroundColor: colors.secondaryBackground, overflow: 'hidden', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { color: colors.muted, fontSize: 12 },
  caption: { color: colors.text, fontSize: 15, lineHeight: 22 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 30 },
  creator: { color: colors.muted, fontSize: 11, flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(35, 25, 29, 0.42)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 28, gap: 10, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  modalSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: 145, borderRadius: 14, backgroundColor: colors.secondaryBackground, marginBottom: 3 },
  fieldLabel: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 3 },
  input: { backgroundColor: '#FFFFFF', borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, color: colors.text, fontSize: 14 },
  captionInput: { minHeight: 68, textAlignVertical: 'top' },
  categoryChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 3 },
  categoryChoice: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  categoryChoiceActive: { borderColor: colors.primaryPressed, backgroundColor: colors.secondaryBackground },
  categoryChoiceText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  categoryChoiceTextActive: { color: colors.text },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  photoHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoHintText: { color: colors.muted, fontSize: 10 },
});
