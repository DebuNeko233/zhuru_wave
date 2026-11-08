// Exercise the actual in-component CSVStreamReader without launching Electron.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { File } from 'node:buffer'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
const require = createRequire(import.meta.url)
let ts
try {
  ts = require('typescript')
} catch {
  const globalRoot = execFileSync('npm', ['root', '-g'], {encoding:'utf8'}).trim()
  ts = require(path.join(globalRoot, 'typescript'))
}
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root,'src/renderer/src/components/ChannelInfo/c-cpns/InteractiveWaveChart.vue'),'utf8')
const match = source.match(/interface StreamCSVOptions \{[\s\S]*?\n\}\n\nclass CSVStreamReader \{[\s\S]*?\n\}\n\n\/\/ 导入数据功能/)
assert.ok(match,'CSVStreamReader code block exists')
const code = ts.transpileModule(match[0].replace(/\/\/ 导入数据功能$/, ''),
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
const context = {File,TextDecoder,console,Math,Number,Promise,
  isLocalDataLoading:{value:false}, loadingProgress:{value:0}}
vm.runInNewContext(`${code}\nthis.CSVStreamReader = CSVStreamReader;`,context)
const Reader = context.CSVStreamReader

async function run(name, content, expected, batchSize=3) {
  const file = new File([content],name)
  const seen=[]
  let busy=false, metadata=null, complete=null
  let resolveDone, rejectDone
  const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject})
  const reader = new Reader(file,{batchSize,chunkSize:16,channelId:1,
    onBatchReady:async(batch,idx,progress,channel,meta)=>{
      assert.ok(!busy,'batch detection must be sequential')
      busy=true
      await new Promise(r=>setTimeout(r,2))
      seen.push(...batch)
      metadata=meta
      busy=false
    },
    onComplete:n=>{complete=n;resolveDone()},
    onError:rejectDone})
  reader.start()
  await done
  assert.deepEqual(seen,expected)
  assert.equal(complete,expected.length)
  assert.ok(!busy)
  return metadata
}

const meta=await run('demo.csv',[
'meta_key,meta_value,sample_index,X_raw',
'format,zhuru-wave-v1,,',
'sample_rate_hz,250000,,',
'channel_count,1,,',
'channel_names,X,,',
',,0,20625.3',',,1,18750.3',',,2,17500.3',',,3,-12.5',
''].join('\n'),[20625.3,18750.3,17500.3,-12.5])
assert.equal(meta.sample_rate_hz,'250000')
await run('legacy.csv','20625.3\n18750.3\n-12.5\n',[20625.3,18750.3,-12.5])
await run('indexed.csv','index,raw_value\n0,12.5\n1,-2.5\n',[12.5,-2.5])
await run('drc.csv','DRC_File: test.drc\nChannels_qnty: 1 Header_size: 164 Time_DIV: 2000000\nCH \t Index \t Value \n1\t0\t20625.3\n1\t1\t-12.5\n',[20625.3,-12.5])
console.log('CSV streaming parser: 4 cases passed; await order and final batch verified')
