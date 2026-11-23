import { afterEach, expect, test, vi } from 'vitest';
import plugin from '../index.ts';
import { submitGeneration } from './client.ts';
import { MODELS } from './model-catalog.ts';
const image = 'https://example.com/authorized.png';
const video = 'https://example.com/authorized.mp4';
const audio = 'https://example.com/authorized.mp3';
const handler = plugin.getToolHandler('generate')!;
afterEach(() => vi.unstubAllGlobals());
async function capture(values: Record<string, unknown>) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task_id: 'one-submission', status: 'pending' }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const input = handler.inputSchema.parse({ prompt: 'One blue paper sphere', ...values });
  await submitGeneration(input, 'test-key');
  expect(fetch).toHaveBeenCalledTimes(1);
  return JSON.parse(fetch.mock.calls[0]![1].body);
}
test('keeps exact custom model IDs available', () => {
  expect(handler.inputSchema.parse({ prompt: 'One blue paper sphere', model: 'future-custom-model' }).model).toBe('future-custom-model');
});

for (const model of MODELS) test(`preserves ${model} and its required reference`, async () => {
  const firstFrameUrl = model.includes('lite-i2v') ? image : undefined;
  const body = await capture({ model, firstFrameUrl });
  expect(body.model).toBe(model);
  expect(body.content[0]).toEqual({ type: 'text', text: 'One blue paper sphere' });
  if (firstFrameUrl) expect(body.content[1]).toEqual({ type: 'image_url', image_url: { url: image }, role: 'first_frame' });
});
test('preserves typed frame, image, video and audio references', async () => {
  const body = await capture({ model: 'doubao-seedance-2-5-260628', firstFrameUrl: image, lastFrameUrl: image, referenceImageUrls: [image], referenceVideoUrls: [video], referenceAudioUrls: [audio] });
  expect(body.content).toEqual([{ type: 'text', text: 'One blue paper sphere' }, { type: 'image_url', image_url: { url: image }, role: 'first_frame' }, { type: 'image_url', image_url: { url: image }, role: 'last_frame' }, { type: 'image_url', image_url: { url: image }, role: 'reference_image' }, { type: 'video_url', video_url: { url: video }, role: 'reference_video' }, { type: 'audio_url', audio_url: { url: audio }, role: 'reference_audio' }]);
});
test('rejects incomplete image-only or last-frame requests before transport', async () => {
  await expect(capture({ model: 'doubao-seedance-1-0-lite-i2v-250428' })).rejects.toThrow('first frame');
  expect(fetch).not.toHaveBeenCalled();
  await expect(capture({ lastFrameUrl: image })).rejects.toThrow('first frame');
  expect(fetch).not.toHaveBeenCalled();
});
