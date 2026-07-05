/** Typed skin selector UI strings for `Astro.locals.t` (Starlight plugin-translations pattern). */
declare namespace StarlightApp {
  interface I18n {
    'starlightThemeChameleon.skinSelect.accessibleLabel': string
  }
}

declare module 'virtual:starlight-theme-chameleon/config' {
  /** Reader-facing subset of the resolved Chameleon config, generated at build time. */
  const config: {
    skinSelector: 'hidden' | 'select' | 'icon'
    themeSelector: 'select' | 'icon'
    skins: Array<{
      name: string
      label: string
    }>
  }
  export default config
}
