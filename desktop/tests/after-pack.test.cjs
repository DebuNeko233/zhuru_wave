'use strict'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { REQUIRED_NATIVE_DLLS, ensureNativeFiles } = require('../build/afterPack.cjs')

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wave-pack-'))
  const source = path.join(root, 'src')
  const target = path.join(root, 'out', 'resources', 'native')
  fs.mkdirSync(source, { recursive: true })
  for (const name of REQUIRED_NATIVE_DLLS) fs.writeFileSync(path.join(source, name), `vendor-${name}`)
  try { run({ source, target }) } finally { fs.rmSync(root, { recursive: true, force: true }) }
}

test('stages every required vendor DLL in win-unpacked/resources/native', () => {
  fixture(({ source, target }) => {
    ensureNativeFiles(source, target, true)
    for (const name of REQUIRED_NATIVE_DLLS) {
      assert.equal(fs.readFileSync(path.join(target, name), 'utf8'), `vendor-${name}`)
    }
    ensureNativeFiles(source, target, false)
  })
})

test('recovers a stale DLL without overwriting unrelated resources', () => {
  fixture(({ source, target }) => {
    ensureNativeFiles(source, target, true)
    fs.writeFileSync(path.join(target, 'HTHardDll.dll'), 'stale')
    fs.writeFileSync(path.join(target, 'keep.txt'), 'intact')
    ensureNativeFiles(source, target, true)
    assert.equal(fs.readFileSync(path.join(target, 'HTHardDll.dll'), 'utf8'), 'vendor-HTHardDll.dll')
    assert.equal(fs.readFileSync(path.join(target, 'keep.txt'), 'utf8'), 'intact')
  })
})

test('refuses to package when a source DLL is absent', () => {
  fixture(({ source, target }) => {
    fs.rmSync(path.join(source, 'HTSoftDll.dll'))
    assert.throws(() => ensureNativeFiles(source, target, true), /HTSoftDll\.dll/)
  })
})

test('verifier detects missing packaged DLLs', () => {
  fixture(({ source, target }) => {
    ensureNativeFiles(source, target, true)
    fs.rmSync(path.join(target, 'MeasDll.dll'))
    assert.throws(() => ensureNativeFiles(source, target, false), /MeasDll\.dll/)
  })
})
