'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { ensureNativeFiles } = require('../build/afterPack.cjs')

const desktopDir = path.resolve(__dirname, '..')
const buildDir = path.join(desktopDir, 'dist')
const sourceDir = path.join(desktopDir, 'src', 'native')
const targetCandidates = ['win-unpacked', 'win-x64-unpacked']
  .map(name => path.join(buildDir, name, 'resources', 'native'))
const targetDir = targetCandidates.find(dir => fs.existsSync(dir))
if (!targetDir) {
  console.error(`[native DLL] Could not find unpacked Windows resources directory:\n${targetCandidates.join('\n')}`)
  process.exitCode = 1
} else {
  try {
    ensureNativeFiles(sourceDir, targetDir, false)
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}
