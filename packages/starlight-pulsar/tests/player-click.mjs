import { readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const assets = fileURLToPath(new URL('../../../dist/_astro/', import.meta.url))
const moduleName = (await readdir(assets)).find((name) =>
  /^Player\.astro_astro_type_script_index_0_lang\..+\.js$/.test(name)
)
if (!moduleName) throw new Error('Build the site before running the player click test.')

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
  dataset = {
    tunes: '["grid"]',
    labelPlay: 'Play tune',
    labelPause: 'Pause tune',
    labelLoading: 'Loading tune',
  }
  querySelectorAll(selector) {
    return selector === '[data-action]' ? [button] : []
  }
  querySelector(selector) {
    return selector === '.pulsar-trigger' ? button : null
  }
}

const registry = new Map()
globalThis.HTMLElement = MockElement
globalThis.customElements = {
  get: (name) => registry.get(name),
  define: (name, constructor) => registry.set(name, constructor),
}
globalThis.document = {
  createElement: () => ({ relList: { supports: () => false } }),
  getElementsByTagName: () => [],
  head: { appendChild() {} },
  querySelectorAll: (selector) => (selector === 'pulsar-player' && player ? [player] : []),
  querySelector: () => null,
}
globalThis.window = {
  addEventListener() {},
  dispatchEvent() {},
  matchMedia: () => ({ matches: true }),
  devicePixelRatio: 1,
}
globalThis.localStorage = { getItem: () => null, setItem() {} }
globalThis.requestAnimationFrame = () => 1
globalThis.cancelAnimationFrame = () => {}

await import(pathToFileURL(`${assets}/${moduleName}`))
const Player = customElements.get('pulsar-player')
player = new Player()
player.connectedCallback()
button.click()

if (button.dataset.state !== 'loading') {
  console.error(`Expected a click to show loading immediately; got ${button.dataset.state}.`)
  process.exit(1)
}

console.log('Player click shows loading immediately.')
process.exit(0)
