// `@strudel/web` ships no type declarations. A shorthand ambient module keeps
// the dynamic `import('@strudel/web')` in the tune selector from erroring; the
// few members Pulsar touches are narrowed at the call site instead.
//
// Deliberately a script, not a module: no top-level import or export, or this
// would be read as augmenting a module that has no types to augment.
declare module '@strudel/web'
