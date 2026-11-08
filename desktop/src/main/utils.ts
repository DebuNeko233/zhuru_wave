import type { Point } from './type'

export function flattenTubiandianList(tubiandian_list): Point[] {
  const result: Point[] = []

  tubiandian_list.forEach((item) => {
    // 遍历每个对象的键值对
    Object.entries(item).forEach(([key, value]) => {
      result.push({
        x: parseInt(key), // 将字符串键转换为数字作为 x 坐标
        y: value as number // 值作为 y 坐标
      })
    })
  })

  return result
}
