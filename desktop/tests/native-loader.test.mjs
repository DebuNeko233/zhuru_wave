import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { checkNativeWaveFiles, loadNativeWaveLibrary } from '../src/main/native-loader.ts'

function fixture(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'zhuru-native-'))
  try { return fn(dir) } finally { rmSync(dir, { recursive: true, force: true }) }
}
function addNativeFiles(dir) {
  for (const name of ['libwave.dll', 'HTHardDll.dll', 'HTSoftDll.dll']) {
    writeFileSync(path.join(dir, name), 'fake binary only for loader order tests')
  }
}

test('preloads transitive vendor DLL dependencies in correct order', () => fixture(dir => {
  addNativeFiles(dir)
  const seen = []
  const koffi = { load: file => { seen.push(path.basename(file)); return { file } } }
  const result = loadNativeWaveLibrary(koffi, path.join(dir, 'libwave.dll'))
  assert.deepEqual(seen, ['HTSoftDll.dll', 'HTHardDll.dll', 'libwave.dll'])
  assert.equal(result.dependencies.length, 2)
  assert.equal(path.basename(result.lib.file), 'libwave.dll')
}))

test('fails fast and lists missing packaged dependencies', () => fixture(dir => {
  writeFileSync(path.join(dir, 'libwave.dll'), 'test')
  assert.throws(() => checkNativeWaveFiles(path.join(dir, 'libwave.dll')),
    err => err.message.includes('HTHardDll.dll') && err.message.includes('HTSoftDll.dll') && err.message.includes(dir))
}))

test('reports which existing DLL failed to load and suggests VC runtime check', () => fixture(dir => {
  addNativeFiles(dir)
  assert.throws(() => loadNativeWaveLibrary({ load(file) {
    if (file.endsWith('libwave.dll')) throw new Error('找不到指定的模块')
    return { file }
  } }, path.join(dir, 'libwave.dll')),
  err => err.message.includes('libwave.dll') && err.message.includes('VCRUNTIME140.dll') && err.message.includes('找不到指定的模块'))
}))
