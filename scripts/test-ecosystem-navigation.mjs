import assert from 'node:assert/strict';
import { installEcosystemNavigation } from '../src/utils/ecosystemNavigation.js';

function createDocument() {
  const listeners = new Map();
  const script = {
    dataset: {},
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    remove() {
      this.removed = true;
    },
    emit(type) {
      listeners.get(type)?.();
    },
  };

  return {
    script,
    head: { appendChild(node) { this.node = node; } },
    querySelector() { return null; },
    createElement() { return script; },
  };
}

const windowObject = {};
const documentObject = createDocument();
const first = installEcosystemNavigation({ windowObject, documentObject });
const second = installEcosystemNavigation({ windowObject, documentObject });
assert.strictEqual(first, second, 'concurrent installs must share one promise');
assert.equal(documentObject.head.node.src, 'https://petertecnet.com.br/ecosystem/peter-navigation-v1.js?v=1.0.0');
documentObject.script.emit('error');
await assert.rejects(first, /failed to load/);
assert.equal(documentObject.script.removed, true, 'failed scripts must be removed for retry');

console.log('ecosystem navigation loader regression tests passed');
