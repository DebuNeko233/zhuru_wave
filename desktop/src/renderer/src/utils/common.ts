export function formatDate(timestamp: number): string {
  // 如果是秒级时间戳（10位），要乘 1000
  if (timestamp.toString().length === 10) {
    timestamp = timestamp * 1000
  }

  const d = new Date(timestamp)
  const pad = (n) => n.toString().padStart(2, '0')

  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  const seconds = pad(d.getSeconds())

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
