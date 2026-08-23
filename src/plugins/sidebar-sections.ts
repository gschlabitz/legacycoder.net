import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { StarlightPlugin } from '@astrojs/starlight/types'

export interface StarlightSidebarSectionsUserConfig {
  /**
   * Top-level entries to leave out of the sidebar entirely — directory names
   * or page filenames with extension (`playground.mdx`). Locale directories
   * are excluded automatically — they are routing, not sections.
   */
  exclude?: string[]
  /**
   * Display names for sections, keyed by directory name. A sidebar group has
   * no page behind it, so without an entry here the directory name (a slug)
   * shows through.
   */
  labels?: Record<string, string>
}

interface Entry {
  key: string
  isSection: boolean
}

/**
 * Builds Starlight's top-level sidebar from the docs collection, minus the
 * directories you name.
 *
 * Starlight's own autogeneration walks the whole collection, which is wrong
 * for any site whose collection holds more than its documentation — a blog
 * plugin storing posts as docs pages will bury every real section under them.
 */
export default function starlightSidebarSections(
  userConfig: StarlightSidebarSectionsUserConfig = {},
): StarlightPlugin {
  const { exclude = [], labels = {} } = userConfig

  return {
    name: 'starlight-sidebar-sections',
    hooks: {
      'config:setup'({ config, updateConfig, astroConfig, command, logger }) {
        const docsDir = fileURLToPath(new URL('content/docs/', astroConfig.srcDir))

        // Locale directories hold translations of the same sections, not
        // sections of their own; Starlight routes them itself.
        const localeDirs = Object.keys(config.locales ?? {}).filter((locale) => locale !== 'root')
        const skip = new Set([...exclude, ...localeDirs])

        // Drafts are absent from a production build, so an entry pointing at
        // one fails the build outright. They stay listed under `dev`, which is
        // the only place they exist.
        const keepDrafts = command === 'dev'

        const entries = fs
          .readdirSync(docsDir, { withFileTypes: true })
          .flatMap<Entry>((entry) => {
            if (skip.has(entry.name)) return []
            if (entry.isDirectory()) return [{ key: entry.name, isSection: true }]
            if (!/\.mdx?$/.test(entry.name)) return []

            const key = entry.name.replace(/\.mdx?$/, '')
            const frontmatter = fs.readFileSync(docsDir + entry.name, 'utf8')
            const isDraft = /^draft:\s*true\s*$/m.test(frontmatter)
            return isDraft && !keepDrafts ? [] : [{ key, isSection: false }]
          })
          // The landing page leads; the rest sort alphabetically.
          .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

        const unlabelled = entries.filter((e) => e.isSection && !labels[e.key])
        if (unlabelled.length > 0) {
          logger.warn(
            `No label for ${unlabelled.map((e) => `\`${e.key}\``).join(', ')} — ` +
              'the directory name will show in the sidebar.',
          )
        }

        updateConfig({
          sidebar: entries.map((entry) =>
            entry.isSection
              ? {
                  label: labels[entry.key] ?? entry.key,
                  items: [{ autogenerate: { directory: entry.key } }],
                }
              : { slug: entry.key === 'index' ? '' : entry.key },
          ),
        })

        // Known limitation: this listing is read once, at config time, so
        // adding or renaming a *top-level* page needs a dev server restart —
        // a removed one leaves the sidebar pointing at a slug that no longer
        // resolves, which errors every page until you restart. Section
        // contents are Starlight `autogenerate` groups and still hot-reload.
        //
        // `addWatchFile` looked like the fix and is not. Pointed at the docs
        // directory it never fires; pointed at each page file it does restart
        // on a rename, but the config reload then races the content collection
        // re-scan and can leave the server erroring anyway. Restarting by hand
        // is the reliable move.
      },
    },
  }
}

/** Sorts `index` first by treating it as the empty string. */
function sortKey(entry: Entry): string {
  return entry.key === 'index' ? '' : entry.key
}
