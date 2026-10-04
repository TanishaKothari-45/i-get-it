import { useMemo } from 'react'

// Renders a model-drawn SVG after stripping anything that could run or load: scripts, handlers, links, images, foreign content.
const ALLOWED = new Set(['svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'tspan', 'title'])

export function sanitizeSvg(src: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(src, 'image/svg+xml')
    const root = doc.documentElement
    if (!root || root.tagName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null
    const walk = (el: Element) => {
      for (const child of Array.from(el.children)) {
        if (!ALLOWED.has(child.tagName.toLowerCase())) { child.remove(); continue }
        for (const attr of Array.from(child.attributes)) {
          const n = attr.name.toLowerCase()
          if (n.startsWith('on') || n === 'href' || n === 'xlink:href' || n === 'style' && /url\(|expression/i.test(attr.value)) child.removeAttribute(attr.name)
        }
        walk(child)
      }
    }
    for (const attr of Array.from(root.attributes)) { const n = attr.name.toLowerCase(); if (n.startsWith('on') || n === 'href') root.removeAttribute(attr.name) }
    walk(root)
    root.setAttribute('width', '100%'); root.removeAttribute('height'); root.setAttribute('role', 'img')
    if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', '0 0 320 200')
    return new XMLSerializer().serializeToString(root)
  } catch { return null }
}

export default function Illustration({ svg }: { svg?: string }) {
  const clean = useMemo(() => (svg ? sanitizeSvg(svg) : null), [svg])
  if (!clean) return null
  return <div className="illo" dangerouslySetInnerHTML={{ __html: clean }} />
}
