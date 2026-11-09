import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapDefectsToDisplay } from '../src/main/defect-alignment.ts'

test('red markers land on the actual waveform even after aggressive decimation', () => {
  const raw = Array.from({ length: 2000 }, (_, i) => Math.sin(i / 10))
  raw[123] = 1000 // uniform sampling would miss this spike
  const plot = mapDefectsToDisplay(raw, 100, [{ x: 123, y: 1000 }])
  assert.equal(plot.showData.length, 100)
  assert.deepEqual(plot.defectPoints, [{ x: 6, y: 1000 }])
  assert.equal(plot.showData[6], 1000)
})

test('normal display is unmodified and full-resolution indexes stay intact', () => {
  const raw = [10, 20, 30, 40]
  const plot = mapDefectsToDisplay(raw, 100, [{ x: 2, y: 999 }])
  assert.deepEqual(plot.showData, raw)
  assert.deepEqual(plot.defectPoints, [{ x: 2, y: 30 }])
})

test('overlapping source defects map to one pixel-bin marker with strongest deviation', () => {
  const raw = Array.from({ length: 1000 }, () => 0)
  raw[61] = 2
  raw[63] = 10
  const plot = mapDefectsToDisplay(raw, 100, [{ x: 61, y: 2 }, { x: 63, y: 10 }])
  assert.deepEqual(plot.defectPoints, [{ x: 6, y: 10 }])
})

test('cycle spans stay in display coordinates, and interval-only faults keep no point', () => {
  const raw = Array.from({ length: 2000 }, (_, i) => i)
  const cycles = [{ start_index: 101, end_index_exclusive: 150, peak_index: null, types: ['amplitude_drift'], score: 1.5 }]
  const plot = mapDefectsToDisplay(raw, 100, [], cycles)
  assert.deepEqual(plot.defectPoints, [])
  assert.deepEqual(plot.defectCycles, [{ start_index: 5, end_index_exclusive: 8, peak_index: null, types: ['amplitude_drift'], score: 1.5 }])
})
