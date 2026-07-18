// The bio timeline's data source: the blog archive. Every blog post is a
// timeline event (ADR-0004) — this module loads the root-locale posts,
// enforces the rules the shared docs schema can't express, and derives the
// per-event fields the /bio page renders.
import { getCollection, type CollectionEntry } from 'astro:content';

// The closed tag vocabulary. Tags are load-bearing (filter chips, sphere
// derivation, pin icons), so anything outside this list fails the build —
// a misspelled `career` would otherwise silently file a work post under
// life. Grow the list deliberately; add a TAG_ICONS entry when you do.
export const TIMELINE_TAGS = ['career', 'skills', 'family', 'travel', 'hobby'] as const;

export type Sphere = 'work' | 'life';

export interface TimelineEvent {
  entry: CollectionEntry<'docs'>;
  date: Date;
  title: string;
  tags: string[];
  // Derived, never stored: a post tagged `career` is work, all else is life.
  sphere: Sphere;
  location: NonNullable<CollectionEntry<'docs'>['data']['location']>;
  // Route of the post this event is a lens on.
  url: string;
  // The most deliberate summary available: excerpt ?? description. Null
  // means "nothing authored" — the caller renders the full post body.
  summary: string | null;
}

// Markdown-authored strings (descriptions occasionally carry links) shown as
// plain text on the timeline: keep the link text, drop the plumbing.
function stripInlineMarkdown(text: string): string {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  // Root-locale posts only; German lives under `de/blog/` and the bio page
  // is English for now.
  const posts = (await getCollection('docs')).filter((entry) =>
    entry.id.startsWith('blog/')
  );

  const events: TimelineEvent[] = [];
  for (const post of posts) {
    const { title, date, draft, tags = [], location, excerpt, description } = post.data;

    // Vocabulary is checked on every post, drafts included — typos should
    // die before they settle in.
    for (const tag of tags) {
      if (!(TIMELINE_TAGS as readonly string[]).includes(tag)) {
        throw new Error(
          `${post.id}: unknown tag "${tag}". The vocabulary is closed ` +
            `(${TIMELINE_TAGS.join(', ')}) — add to TIMELINE_TAGS in ` +
            `src/lib/timeline.ts if this is deliberate.`
        );
      }
    }

    // Drafts are the blog's own concept: visible in dev, absent in prod —
    // the timeline is a lens, so it shows exactly the same set.
    if (draft && import.meta.env.PROD) continue;

    // Published posts must be locatable and datable; drafts may skip the
    // location while they're being written (zero-ceremony capture) and are
    // simply left off the dev timeline until they have coordinates.
    if (!date) {
      if (draft) continue;
      throw new Error(`${post.id}: a blog post needs a date to sit on the timeline.`);
    }
    if (!location) {
      if (draft) {
        console.warn(`[timeline] skipping draft without location: ${post.id}`);
        continue;
      }
      throw new Error(
        `${post.id}: published posts need location coordinates — the timeline ` +
          `map's camera track has no holes. Run \`npm run geocode -- "<place>"\`.`
      );
    }

    const summary = excerpt ?? description ?? null;
    events.push({
      entry: post,
      date,
      title,
      tags,
      sphere: tags.includes('career') ? 'work' : 'life',
      location,
      url: `/${post.id}/`,
      summary: summary ? stripInlineMarkdown(summary) : null,
    });
  }

  // Chronological; id (filename) breaks ties so same-day posts keep a
  // stable, authored order.
  return events.sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.entry.id.localeCompare(b.entry.id)
  );
}
