/** Keep chart samples and defect coordinates in the same downsampling map. */
import type { DefectCycle, Point } from './type'

export function mapDefectsToDisplay(
  raw: number[],
  targetLength: number,
  points: Point[] = [],
  cycles: DefectCycle[] = []
): { showData: number[]; defectPoints: Point[]; defectCycles: DefectCycle[] } {
  const n = raw.length
  if (n === 0) return { showData: [], defectPoints: [], defectCycles: [] }
  const count = Math.min(n, Math.max(1, Math.trunc(targetLength) || n))
  const scale = count / n
  const showData = Array.from({ length: count }, (_, i) => raw[Math.floor(i / scale)])
  const chosen = new Map<number, { source: number; contrast: number }>()

  for (const point of points) {
    if (!Number.isFinite(point.x)) continue
    const source = Math.trunc(point.x)
    if (source < 0 || source >= n) continue
    const index = Math.min(count - 1, Math.floor(source * scale))
    const contrast = Math.abs(raw[source] - showData[index])
    const old = chosen.get(index)
    if (!old || contrast > old.contrast) chosen.set(index, { source, contrast })
  }

  // A short spike can disappear when decimated. Retain its actual sample in the
  // corresponding display bin, so the red marker is on the visible line.
  const defectPoints: Point[] = []
  for (const [index, item] of chosen) {
    showData[index] = raw[item.source]
    defectPoints.push({ x: index, y: showData[index] })
  }
  defectPoints.sort((a, b) => a.x - b.x)

  const defectCycles: DefectCycle[] = cycles.flatMap((cycle) => {
    if (!Number.isFinite(cycle.start_index) || !Number.isFinite(cycle.end_index_exclusive)) {
      return []
    }
    const start = Math.max(0, Math.min(count - 1, Math.floor(cycle.start_index * scale)))
    const end = Math.max(start + 1, Math.min(count, Math.ceil(cycle.end_index_exclusive * scale)))
    return [{
      ...cycle,
      start_index: start,
      end_index_exclusive: end,
      peak_index: cycle.peak_index == null
        ? null
        : Math.max(0, Math.min(count - 1, Math.floor(cycle.peak_index * scale)))
    }]
  })
  return { showData, defectPoints, defectCycles }
}
