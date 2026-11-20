import { describe, expect, it, jest } from '@jest/globals';
import type { ImagePickerAsset } from 'expo-image-picker';
import { prepareMemoryImageUpload } from '@/features/spaces/memories';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('memory image uploads', () => {
  it('decodes native picker data into JPEG bytes with an explicit MIME type', async () => {
    const asset = {
      uri: 'file:///memory.png',
      width: 1,
      height: 1,
      fileName: 'memory.png',
      fileSize: 4,
      mimeType: 'text/plain',
      base64: 'AQIDBA==',
    } satisfies ImagePickerAsset;

    const upload = await prepareMemoryImageUpload(asset);

    expect(upload.mimeType).toBe('image/jpeg');
    expect(upload.extension).toBe('jpg');
    expect(upload.data).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(upload.data)]).toEqual([1, 2, 3, 4]);
  });

  it('uses the web file bytes and validates its supported image type', async () => {
    const file = new File([new Uint8Array([5, 6, 7])], 'memory.jpg', { type: 'text/plain' });
    const asset = {
      uri: 'blob:memory',
      width: 1,
      height: 1,
      file,
    } satisfies ImagePickerAsset;

    const upload = await prepareMemoryImageUpload(asset);

    expect(upload.mimeType).toBe('image/jpeg');
    expect([...new Uint8Array(upload.data)]).toEqual([5, 6, 7]);
  });

  it('rejects photos larger than the storage limit', async () => {
    const asset = {
      uri: 'file:///memory.jpg',
      width: 1,
      height: 1,
      fileSize: 10 * 1024 * 1024 + 1,
    } satisfies ImagePickerAsset;

    await expect(prepareMemoryImageUpload(asset)).rejects.toThrow('Choose a photo smaller than 10 MB.');
  });
});
