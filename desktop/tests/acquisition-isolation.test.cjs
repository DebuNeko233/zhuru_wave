const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')
const ts = require('typescript')

test('native acquisition runs in a utility process with compatible messages', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/main/acquisition-process.ts'), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true
    }
  }).outputText

  class FakeChild extends EventEmitter {
    messages = []
    stdout = new EventEmitter()
    stderr = new EventEmitter()
    postMessage(message) { this.messages.push(message) }
    kill() { this.emit('exit', 0); return true }
  }
  const child = new FakeChild()
  let forkArgs
  const context = {
    exports: {},
    console,
    setTimeout,
    clearTimeout,
    require(id) {
      if (id === 'electron') return {
        utilityProcess: { fork: (...args) => { forkArgs = args; return child } }
      }
      if (id === 'node:events') return require('node:events')
      if (id.endsWith('data-worker?modulePath')) return { __esModule: true, default: '/tmp/acquisition-worker.js' }
      throw Error('Unknown dependency: ' + id)
    }
  }
  vm.runInNewContext(js, context, { filename: 'acquisition-process.js' })
  const AcquisitionProcess = context.exports.AcquisitionProcess
  const bridge = new AcquisitionProcess('C:\\Device\\native\\libwave.dll')
  assert.equal(forkArgs[0], '/tmp/acquisition-worker.js')
  assert.match(forkArgs[1][0], /--wave-lib-path=/)
  assert.equal(forkArgs[2].stdio, 'pipe')

  const received = []
  bridge.on('message', message => received.push(message))
  child.emit('message', { type: 'init-success' })
  assert.deepEqual(received, [{ type: 'init-success' }])

  bridge.postMessage({ cmd: 'initDevice' })
  assert.equal(child.messages[0].cmd, 'initDevice')
  assert.equal(await bridge.terminate(), 0)
  assert.throws(() => bridge.postMessage({ cmd: 'start' }), /已退出/)
})

test('data worker recognizes Electron utility parentPort protocol', () => {
  const worker = fs.readFileSync(path.join(__dirname, '../src/main/data-worker.ts'), 'utf8')
  assert.match(worker, /utilityParentPort\.on\('message', \(event\) => listener\(event\.data\)\)/)
  assert.match(worker, /if \(isMainThread && !utilityParentPort\)/)
  assert.match(worker, /--wave-lib-path=/)
})
