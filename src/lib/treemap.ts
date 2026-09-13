/**
 * Squarified treemap layout (Bruls, Huizing, van Wijk). Returns rectangles
 * in the same order as the input. Inputs must be sorted by weight descending
 * for best aspect ratios; zero/negative weights are dropped.
 */
export interface TreemapItem<T> {
  weight: number
  data: T
}

export interface TreemapRect<T> {
  x: number
  y: number
  w: number
  h: number
  data: T
}

export function squarify<T>(items: TreemapItem<T>[], width: number, height: number): TreemapRect<T>[] {
  const valid = items.filter((i) => i.weight > 0)
  const total = valid.reduce((s, i) => s + i.weight, 0)
  if (!valid.length || total <= 0 || width <= 0 || height <= 0) return []
  const scale = (width * height) / total
  const scaled = valid.map((i) => ({ area: i.weight * scale, data: i.data }))

  const out: TreemapRect<T>[] = []
  let x = 0
  let y = 0
  let w = width
  let h = height
  let row: { area: number; data: T }[] = []

  const worst = (r: { area: number }[], side: number) => {
    const sum = r.reduce((s, i) => s + i.area, 0)
    if (sum === 0) return Infinity
    const max = Math.max(...r.map((i) => i.area))
    const min = Math.min(...r.map((i) => i.area))
    const s2 = side * side
    return Math.max((s2 * max) / (sum * sum), (sum * sum) / (s2 * min))
  }

  const layoutRow = () => {
    const sum = row.reduce((s, i) => s + i.area, 0)
    const horizontal = w >= h // lay the row along the shorter side
    if (horizontal) {
      const rowW = sum / h
      let cy = y
      for (const i of row) {
        const ih = i.area / rowW
        out.push({ x, y: cy, w: rowW, h: ih, data: i.data })
        cy += ih
      }
      x += rowW
      w -= rowW
    } else {
      const rowH = sum / w
      let cx = x
      for (const i of row) {
        const iw = i.area / rowH
        out.push({ x: cx, y, w: iw, h: rowH, data: i.data })
        cx += iw
      }
      y += rowH
      h -= rowH
    }
    row = []
  }

  for (const item of scaled) {
    const side = Math.min(w, h)
    if (row.length && worst([...row, item], side) > worst(row, side)) layoutRow()
    row.push(item)
  }
  if (row.length) layoutRow()
  return out
}
