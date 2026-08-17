import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { parse } from 'yaml';

export type MediaEntry = CollectionEntry<'media'>;

const registryPath = resolve(process.cwd(), 'src/data/media.yaml');

/**
 * Astro's file loader warns and overwrites when ids repeat. A media id is an
 * anchor and an authoring key, so ambiguity is a build error instead.
 */
async function assertUniqueRegistryIds(): Promise<void> {
  const parsed = parse(await readFile(registryPath, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) return;

  const seen = new Set<string>();
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || !('id' in item)) continue;
    const id = String(item.id);
    if (seen.has(id)) {
      throw new Error(
        `src/data/media.yaml: duplicate id "${id}". Media ids must be unique.`,
      );
    }
    seen.add(id);
  }
}

export async function getMediaEntries(): Promise<MediaEntry[]> {
  await assertUniqueRegistryIds();
  const entries = await getCollection('media');

  for (const entry of entries) {
    if (!entry.data.post) continue;
    const post = await getEntry('docs', entry.data.post);
    if (!post) {
      throw new Error(
        `${entry.id}: media post "${entry.data.post}" does not resolve to a docs entry.`,
      );
    }
  }

  return entries.sort(
    (a, b) =>
      b.data.added.getTime() - a.data.added.getTime() ||
      a.id.localeCompare(b.id),
  );
}

