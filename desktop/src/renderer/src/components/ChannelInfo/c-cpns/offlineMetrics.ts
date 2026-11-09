/** Accumulate complete-cycle peak statistics across 2,000-point CSV batches.
 *  Never infer a stable period from an unobserved partial cycle at a boundary.
 */
export interface CycleAmplitude {
  start_index: number
  end_index_exclusive: number
  peak_to_peak_raw: number
  period_samples: number
}

export interface StableSpan {
  start_index: number
  end_index_exclusive: number
  cycle_count: number
}

const percentile = (sorted: number[], q: number): number => {
  const at = Math.max(0, Math.min(sorted.length - 1, q * (sorted.length - 1)))
  const low = Math.floor(at)
  const high = Math.ceil(at)
  return sorted[low] + (sorted[high] - sorted[low]) * (at - low)
}

export class OfflinePeakCounter {
  private cycles: CycleAmplitude[] = []
  private offset = 0

  addBatch(batchSize: number, cycles: CycleAmplitude[]): {
    count: number
    reference: number | null
    spans: StableSpan[]
    currentBatchSpans: StableSpan[]
  } {
    const batchStart = this.offset
    const batchEnd = batchStart + batchSize
    for (const c of cycles) {
      if (!Number.isFinite(c.peak_to_peak_raw) || c.peak_to_peak_raw <= 0 ||
        c.start_index < 0 || c.end_index_exclusive > batchSize ||
        c.end_index_exclusive <= c.start_index || c.period_samples <= 0) continue
      this.cycles.push({ ...c, start_index: c.start_index + batchStart,
        end_index_exclusive: c.end_index_exclusive + batchStart })
    }
    this.offset = batchEnd
    if (!this.cycles.length) return { count: 0, reference: null, spans: [], currentBatchSpans: [] }

    const amps = this.cycles.map(x => x.peak_to_peak_raw).sort((a,b) => a-b)
    const periods = this.cycles.map(x => x.period_samples).sort((a,b) => a-b)
    const reference = percentile(amps, .90)
    const typicalPeriod = percentile(periods, .50)
    const spans: StableSpan[] = []
    let current: StableSpan | null = null
    let prev: CycleAmplitude | null = null
    for (const cycle of this.cycles) {
      const stable = Math.abs(cycle.peak_to_peak_raw - reference) <= .05 * reference
      // Some complete cycles at the batch edge are unavailable, so join only a
      // short missing margin and count measured cycles, never imaginary ones.
      const contiguous = prev && cycle.start_index - prev.end_index_exclusive <= typicalPeriod * 1.30
      if (!stable) {
        if (current) spans.push(current)
        current = null
      } else if (!current || !contiguous) {
        if (current) spans.push(current)
        current = { start_index: cycle.start_index,
          end_index_exclusive: cycle.end_index_exclusive, cycle_count: 1 }
      } else {
        current.end_index_exclusive = cycle.end_index_exclusive
        current.cycle_count += 1
      }
      prev = cycle
    }
    if (current) spans.push(current)
    const ranked = spans.sort((a,b) => b.cycle_count - a.cycle_count)
    const best = ranked[0]
    const currentBatchSpans: StableSpan[] = !best || best.end_index_exclusive <= batchStart || best.start_index >= batchEnd
      ? [] : [{ ...best,
        start_index: Math.max(best.start_index, batchStart) - batchStart,
        end_index_exclusive: Math.min(best.end_index_exclusive, batchEnd) - batchStart }]
    return { count: best?.cycle_count ?? 0, reference, spans: best ? [best] : [], currentBatchSpans }
  }
}
