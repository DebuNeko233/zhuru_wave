import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseXYCsv, pairedWindow } from '../src/renderer/src/components/Lissajous/xyCsv.ts'

function make(rows = 300, header = 'meta_key,meta_value,sample_index,X1,Y1') {
  return [header, 'format,zhuru-wave-v1,,,', 'sample_rate_hz,125000,,,', 'channel_count,2,,,',
    ...Array.from({ length: rows }, (_, i) => `,,${i},${i * 2},${i * 3}`)].join('\n')
}

test('strict synchronized CSV parser reads two channels and rate', () => {
  const d = parseXYCsv(make())
  assert.equal(d.sampleCount, 300)
  assert.equal(d.sampleRateHz, 125000)
  assert.deepEqual(pairedWindow(d.channels.X1, d.channels.Y1, 5, 256)[0], [10, 15])
})

test('duplicate or asynchronous sample indexes are rejected', () => {
  const malformed = make().replace(',,130,260,390', ',,131,260,390')
  assert.throws(() => parseXYCsv(malformed), /采样索引不连续/)
})

test('must have at least two valid channel columns', () => {
  assert.throws(() => parseXYCsv(make(300, 'meta_key,meta_value,sample_index,X1,JUNK')), /至少两列/)
})

test('does not silently trim two unequal channel streams', () => {
  assert.deepEqual(pairedWindow([1, 2, 3], [1, 2], 0, 2048), [])
})
