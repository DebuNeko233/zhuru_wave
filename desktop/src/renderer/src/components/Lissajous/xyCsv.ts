/** Synchronous multi-channel acquisition CSV. No joining unrelated single-channel recordings. */
export const CHANNEL_LABELS = ['X1', 'Y1', 'X2', 'Y2'] as const
export type XYChannel = (typeof CHANNEL_LABELS)[number]
export type XYRecording = {
  channels: Partial<Record<XYChannel, number[]>>
  sampleCount: number
  sampleRateHz: number | null
  scenario: string
}

const normalizeColumn = (column: string): XYChannel | null => {
  const key = column.trim().toUpperCase()
  if (CHANNEL_LABELS.includes(key as XYChannel)) return key as XYChannel
  if (key === 'X_RAW') return 'X1'
  if (key === 'Y_RAW') return 'Y1'
  return null
}

export function parseXYCsv(text: string): XYRecording {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  if (lines.length < 6) throw new Error('CSV 数据不足')
  const headers = lines[0].split(',').map(x => x.trim())
  if (headers[0] !== 'meta_key' || headers[1] !== 'meta_value' || headers[2] !== 'sample_index') {
    throw new Error('需要 meta_key,meta_value,sample_index,X1,Y1 格式的同步多通道 CSV')
  }
  const indices = new Map<XYChannel, number>()
  for (let i = 3; i < headers.length; i++) {
    const name = normalizeColumn(headers[i])
    if (!name) continue
    if (indices.has(name)) throw new Error('CSV 通道列重复: ' + name)
    indices.set(name, i)
  }
  if (indices.size < 2) throw new Error('XY 需要至少两列有效通道数据')
  const metadata: Record<string, string> = {}
  const channels: Partial<Record<XYChannel, number[]>> = {}
  for (const name of indices.keys()) channels[name] = []
  let nextSample = 0
  let dataStarted = false
  for (let lineNo = 1; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo].trim()
    if (!line) continue
    const parts = line.split(',').map(x => x.trim())
    if (parts[0]) {
      if (dataStarted) throw new Error(`第 ${lineNo + 1} 行：元数据必须位于采样数据之前`)
      metadata[parts[0]] = parts[1] || ''
      continue
    }
    if (!parts[2]) continue
    dataStarted = true
    const sample = Number(parts[2])
    if (!Number.isInteger(sample) || sample !== nextSample) {
      throw new Error(`第 ${lineNo + 1} 行采样索引不连续，无法保证 X/Y 同步`)
    }
    for (const [name, i] of indices) {
      const value = Number(parts[i])
      if (!parts[i] || !Number.isFinite(value)) throw new Error(`第 ${lineNo + 1} 行 ${name} 无效`)
      channels[name]!.push(value)
    }
    nextSample++
    if (nextSample > 250000) throw new Error('单文件最多支持 250000 个采样点')
  }
  if (nextSample < 256) throw new Error('同步记录至少需要 256 个采样点')
  if (metadata.channel_count && Number(metadata.channel_count) !== indices.size) {
    throw new Error('通道数元数据与实际 CSV 列数不匹配')
  }
  const rate = Number(metadata.sample_rate_hz)
  return {
    channels,
    sampleCount: nextSample,
    sampleRateHz: rate > 0 && Number.isFinite(rate) ? rate : null,
    scenario: metadata.scenario || ''
  }
}

export function pairedWindow(x: number[], y: number[], start: number, length: number): number[][] {
  if (x.length !== y.length || x.length < 256) return []
  const from = Math.max(0, Math.min(Math.floor(start), x.length - 1))
  const to = Math.min(x.length, from + length)
  if (to - from < 256) return []
  const points: number[][] = []
  for (let i = from; i < to; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) return []
    points.push([x[i], y[i]])
  }
  return points
}
