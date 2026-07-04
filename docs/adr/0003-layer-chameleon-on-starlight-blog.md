# Layer Chameleon on top of starlight-blog instead of replacing it

Skin switching (the Chameleon plugin) is built as a second plugin layered
over starlight-blog, not as a fork or replacement blog engine. starlight-blog
earns its keep: locale-aware routes and pagination, container-rendered RSS,
the blog sidebar middleware, draft/excerpt/metrics handling, German UI
strings, and the frontmatter schema all 148 migrated posts are written
against — none of it visible enough to justify rewriting, all of it
maintained upstream against Starlight's release pace. The only resource the
two plugins contest is the `ThemeSelect` override slot; the site resolves
that by setting starlight-blog's `navigation: 'header-start'` (Blog link
renders via `SiteTitle` instead) once Chameleon claims the slot for its
skin picker. Chameleon runs after `starlightBlog()` in the plugins array
so it sees the final component map.
