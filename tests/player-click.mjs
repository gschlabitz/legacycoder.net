import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const assets = fileURLToPath(new URL('../dist/_astro/', import.meta.url))
const moduleName = (await readdir(assets)).find((name) =>
  /^StrudelPlayer\.astro_astro_type_script_index_0_lang\..+\.js$/.test(name)
)
if (!moduleName) throw new Error('StrudelPlayer build asset missing. Run npm run build before npm test.')

class MockButton {
  dataset = { action: 'playpause', state: 'armed' }
  listeners = new Map()
  addEventListener(type, listener) {
    this.listeners.set(type, listener)
  }
  setAttribute(name, value) {
    if (name === 'aria-label') this.ariaLabel = value
  }
  toggleAttribute(name, force) {
    this[name] = force
  }
  click() {
    this.listeners.get('click')?.()
  }
}

const button = new MockButton()
let player
class MockElement {
  parentElement = null
  dataset = {
    tunes: 'grid',
    labelPlay: 'Play tune',
    labelPause: 'Pause tune',
    labelLoading: 'Loading tune',
  }
  querySelectorAll(selector) {
    return selector === '[data-action]' ? [button] : []
  }
  querySelector(selector) {
    return selector === '.tune-player-trigger' ? button : null
  }
}

const registry = new Map()
globalThis.HTMLElement = MockElement
globalThis.CustomEvent = class {
  constructor(type) {
    this.type = type
  }
}
globalThis.customElements = {
  get: (name) => registry.get(name),
  define: (name, constructor) => registry.set(name, constructor),
}
globalThis.document = {
  body: {
    appendChild(element) {
      element.parentElement = this
      element.connectedCallback()
    },
  },
  createElement: () => ({ relList: { supports: () => false } }),
  getElementsByTagName: () => [],
  head: { appendChild() {} },
  querySelectorAll: (selector) => (selector === 'tune-player' && player ? [player] : []),
  querySelector: () => null,
}
globalThis.window = {
  addEventListener() {},
  dispatchEvent() {},
  matchMedia: () => ({ matches: true }),
  devicePixelRatio: 1,
}
globalThis.requestAnimationFrame = () => 1
globalThis.cancelAnimationFrame = () => {}

await import(pathToFileURL(`${assets}/${moduleName}`))
const Player = customElements.get('tune-player')
assert.ok(Player, 'StrudelPlayer must register the tune-player element.')
player = new Player()
player.connectedCallback()
assert.equal(player.parentElement, document.body, 'The player must move out of the page stacking context.')
assert.equal(button.dataset.state, 'armed')
assert.equal(button.ariaLabel, 'Play tune')
button.click()

assert.equal(button.dataset.state, 'loading', 'A click must show loading immediately.')
assert.equal(button.disabled, true, 'Disable the button while the audio engine loads.')
assert.equal(button['aria-busy'], true)
assert.equal(button.ariaLabel, 'Loading tune')

console.log('Player click shows loading immediately.')
// This regression checks synchronous click feedback, before Web Audio loads.
process.exit(0)
