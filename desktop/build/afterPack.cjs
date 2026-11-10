// Electron Builder's extraResources should place the vendor DLLs in
// <appOutDir>/resources/native.  Guard against packaging configurations that
// omit them: stage the exact required files and verify the installed copies.
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const REQUIRED_NATIVE_DLLS = Object.freeze([
  'libwave.dll',
  'HTHardDll.dll',
  'HTSoftDll.dll',
  'HTDisplayDll.dll',
  'MeasDll.dll'
])

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex')
}

function ensureNativeFiles(sourceDir, targetDir, copyIfMissing = false) {
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`[native DLL] Source directory missing: ${sourceDir}`)
  }
  if (copyIfMissing) fs.mkdirSync(targetDir, { recursive: true })

  for (const name of REQUIRED_NATIVE_DLLS) {
    const from = path.join(sourceDir, name)
    const to = path.join(targetDir, name)
    if (!fs.existsSync(from) || fs.statSync(from).size === 0) {
      throw new Error(`[native DLL] Required vendor DLL missing or empty: ${from}`)
    }
    if (copyIfMissing && (!fs.existsSync(to) || sha256(from) !== sha256(to))) {
      fs.copyFileSync(from, to)
      console.log(`[native DLL] Staged ${name} -> ${to}`)
    }
    if (!fs.existsSync(to) || sha256(from) !== sha256(to)) {
      throw new Error(`[native DLL] Packaged DLL missing or different: ${to}`)
    }
  }
  console.log(`[native DLL] Verified ${REQUIRED_NATIVE_DLLS.length} DLLs: ${targetDir}`)
}

async function afterPack(context) {
  // The devices and their SDK are Windows x64-only.
  if (context.electronPlatformName !== 'win32') return
  const sourceDir = path.resolve(__dirname, '..', 'src', 'native')
  const targetDir = path.join(context.appOutDir, 'resources', 'native')
  ensureNativeFiles(sourceDir, targetDir, true)
}

module.exports = afterPack
module.exports.REQUIRED_NATIVE_DLLS = REQUIRED_NATIVE_DLLS
module.exports.ensureNativeFiles = ensureNativeFiles
