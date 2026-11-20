import type { ImagePickerAsset } from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
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

const maxMemoryPhotoSize = 10 * 1024 * 1024;
const extensionByMime: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
};
const mimeByExtension: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
};

function getSupportedMimeType(mimeType: string | null | undefined, fileName: string | null | undefined) {
  const normalizedMimeType = mimeType?.split(';', 1)[0].trim().toLowerCase();
  const canonicalMimeType = normalizedMimeType === 'image/jpg' ? 'image/jpeg' : normalizedMimeType;
  if (canonicalMimeType && extensionByMime[canonicalMimeType]) return canonicalMimeType;

  const extension = fileName?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  const inferredMimeType = extension ? mimeByExtension[extension] : undefined;
  if (!inferredMimeType) throw new Error('Please choose a JPEG, PNG, WebP or HEIC photo.');
  return inferredMimeType;
}

export async function prepareMemoryImageUpload(asset: ImagePickerAsset) {
  if (asset.fileSize != null && asset.fileSize > maxMemoryPhotoSize) {
    throw new Error('Choose a photo smaller than 10 MB.');
  }

  let data: ArrayBuffer;
  let mimeType: string;
  if (asset.file) {
    mimeType = getSupportedMimeType(asset.file.type || asset.mimeType, asset.file.name || asset.fileName);
    data = await asset.file.arrayBuffer();
  } else {
    if (!asset.base64) throw new Error('The selected photo could not be read. Please choose it again.');
    // Expo's native image picker encodes its base64 output as JPEG.
    mimeType = 'image/jpeg';
    data = decode(asset.base64);
  }

  if (data.byteLength > maxMemoryPhotoSize) {
    throw new Error('Choose a photo smaller than 10 MB.');
  }
  return { data, mimeType, extension: extensionByMime[mimeType] };
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
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userResult.user) throw new Error('Sign in again to add a memory.');

  const { data, mimeType, extension } = await prepareMemoryImageUpload(input.asset);
  const id = makeUuid();
  const storagePath = `${input.spaceId}/${id}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('shared-memories')
    .upload(storagePath, data, { contentType: mimeType, upsert: false });
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
