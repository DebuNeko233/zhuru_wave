import assert from 'node:assert/strict'
import { test } from 'node:test'
import { OfflinePeakCounter } from '../src/renderer/src/components/ChannelInfo/c-cpns/offlineMetrics.ts'
const cycle = (index, start, amplitude = 100) => ({ start_index: start, end_index_exclusive: start + 50,
  period_samples: 50, peak_to_peak_raw: amplitude })

test('stable peak cycle count continues through a CSV batch boundary', () => {
  const counter = new OfflinePeakCounter()
  let result = counter.addBatch(2000, Array.from({ length: 39 }, (_,i) => cycle(i, 25+i*50)))
  assert.equal(result.count, 39)
  result = counter.addBatch(2000, Array.from({ length: 39 }, (_,i) => cycle(i, 25+i*50)))
  assert.equal(result.count, 78)
  assert.equal(result.currentBatchSpans[0].start_index, 0)
  assert.equal(result.spans[0].start_index, 25)
})

test('unstable amplitudes interrupt a stable run', () => {
  const counter = new OfflinePeakCounter()
  const a = Array.from({ length: 20 }, (_,i) => cycle(i, i*50, i === 10 ? 30 : 100))
  const result = counter.addBatch(2000, a)
  assert.equal(result.count, 10)
})

test('invalid and incomplete cycles do not count', () => {
  const counter = new OfflinePeakCounter()
  const result = counter.addBatch(500, [cycle(0,0), cycle(1,480), {...cycle(2,70), peak_to_peak_raw: NaN}])
  assert.equal(result.count,1)
})
