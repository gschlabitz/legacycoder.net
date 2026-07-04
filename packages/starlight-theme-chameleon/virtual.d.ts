/** Typed picker UI strings for `Astro.locals.t` (Starlight plugin-translations pattern). */
declare namespace StarlightApp {
  interface I18n {
    'starlightThemeChameleon.skinSelect.accessibleLabel': string
    'starlightThemeChameleon.skinSelect.default': string
  }
}

declare module 'virtual:starlight-theme-chameleon/config' {
  /** Reader-facing subset of the resolved Chameleon config, generated at build time. */
  const config: {
    picker: boolean
    skins: Array<{
      name: string
      label: string | Record<string, string>
    }>
  }
  export default config
}
