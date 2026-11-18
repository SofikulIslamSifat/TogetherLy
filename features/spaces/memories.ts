import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export const MEMORY_CATEGORIES = ['Everyday', 'Travel', 'Celebration', 'Food', 'Milestone', 'Other'] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export type SharedMemory = {
  id: string;
  space_id: string;
  caption: string | null;
  memory_date: string;
  category: MemoryCategory;
  storage_path: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  signed_url: string;
};

function makeUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function imageDetails(asset: ImagePickerAsset) {
  const mimeType = asset.mimeType?.toLowerCase();
  const extensionByMime: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
  };
  if (!mimeType || !extensionByMime[mimeType]) {
    throw new Error('Please choose a JPEG, PNG, WebP or HEIC photo.');
  }
  if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
    throw new Error('Choose a photo smaller than 10 MB.');
  }
  return { mimeType, extension: extensionByMime[mimeType] };
}

export async function getMemories(spaceId: string): Promise<SharedMemory[]> {
  const { data, error } = await supabase.from('memories').select('*').eq('space_id', spaceId)
    .order('memory_date', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row) => {
    const { data: signed, error: signedError } = await supabase.storage
      .from('shared-memories').createSignedUrl(row.storage_path, 60 * 60);
    if (signedError || !signed) throw signedError ?? new Error('A photo link could not be created.');
    return { ...row, signed_url: signed.signedUrl } as SharedMemory;
  }));
}

export async function createMemory(input: {
  spaceId: string; caption: string; memoryDate: string; category: MemoryCategory; asset: ImagePickerAsset;
}) {
  const { mimeType, extension } = imageDetails(input.asset);
  const id = makeUuid();
  const storagePath = `${input.spaceId}/${id}/${Date.now()}.${extension}`;
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userResult.user) throw new Error('Sign in again to add a memory.');

  const response = await fetch(input.asset.uri);
  if (!response.ok) throw new Error('The selected photo could not be read.');
  const fileBlob = await response.blob();
  if (fileBlob.size > 10 * 1024 * 1024) throw new Error('Choose a photo smaller than 10 MB.');
  const { error: uploadError } = await supabase.storage.from('shared-memories')
    .upload(storagePath, fileBlob, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase.from('memories').insert({
    id, space_id: input.spaceId, caption: input.caption.trim() || null,
    memory_date: input.memoryDate, category: input.category, storage_path: storagePath,
    created_by: userResult.user.id,
  });
  if (rowError) {
    // An unregistered object is still deletable by a member of its own space.
    await supabase.storage.from('shared-memories').remove([storagePath]);
    throw rowError;
  }
}

export async function updateMemory(memoryId: string, caption: string, memoryDate: string, category: MemoryCategory) {
  const { error } = await supabase.from('memories').update({
    caption: caption.trim() || null, memory_date: memoryDate, category,
  }).eq('id', memoryId);
  if (error) throw error;
}

export async function deleteMemory(memory: SharedMemory) {
  const { error: storageError } = await supabase.storage.from('shared-memories').remove([memory.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('memories').delete().eq('id', memory.id);
  if (error) throw error;
}
