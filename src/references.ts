import z from 'zod';
const httpsUrl = z.string().url().startsWith('https://');
export const referenceInputs = {
  firstFrameUrl: httpsUrl.optional().meta({ title: 'First frame image URL' }),
  lastFrameUrl: httpsUrl.optional().meta({ title: 'Last frame image URL' }),
  referenceImageUrls: z.array(httpsUrl).min(1).optional().meta({ title: 'Reference image URLs' }),
  referenceVideoUrls: z.array(httpsUrl).min(1).optional().meta({ title: 'Reference video URLs' }),
  referenceAudioUrls: z.array(httpsUrl).min(1).optional().meta({ title: 'Reference audio URLs' })
};
const schema = z.object(referenceInputs);
export type ReferenceInput = z.input<typeof schema>;
export function referencePayload(input: ReferenceInput & { prompt: string; model: string }) {
  const refs = schema.parse(input);
  if (refs.lastFrameUrl && !refs.firstFrameUrl) throw new Error('A last frame requires a first frame image.');
  if (input.model === 'doubao-seedance-1-0-lite-i2v-250428' && !refs.firstFrameUrl) throw new Error('This image-to-video model requires a first frame image.');
  const content: Record<string, unknown>[] = [{ type: 'text', text: input.prompt }];
  if (refs.firstFrameUrl) content.push({ type: 'image_url', image_url: { url: refs.firstFrameUrl }, role: 'first_frame' });
  if (refs.lastFrameUrl) content.push({ type: 'image_url', image_url: { url: refs.lastFrameUrl }, role: 'last_frame' });
  for (const url of refs.referenceImageUrls ?? []) content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' });
  for (const url of refs.referenceVideoUrls ?? []) content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' });
  for (const url of refs.referenceAudioUrls ?? []) content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' });
  return { content };
}
