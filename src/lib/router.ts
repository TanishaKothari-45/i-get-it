import { createElement, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

// A small router over the History API: every screen has its own address, so the
// phone's back button, a refresh and a shared link all land where they should.

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'library' }
  | { name: 'signin' }
  | { name: 'handbook'; id: string }
  | { name: 'chapter'; id: string; n: number }
  | { name: 'done'; id: string; n: number }
  | { name: 'deeper'; id: string; n: number }
  | { name: 'notFound' }

export const paths = {
  home: '/',
  new: '/new',
  library: '/library',
  signin: '/signin',
  handbook: (id: string) => `/h/${id}`,
  chapter: (id: string, n: number) => `/h/${id}/chapter/${n}`,
  done: (id: string, n: number) => `/h/${id}/chapter/${n}/done`,
  deeper: (id: string, n: number) => `/h/${id}/chapter/${n}/deeper`,
}

export function matchRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return { name: 'home' }
  if (parts.length === 1 && parts[0] === 'new') return { name: 'new' }
  if (parts.length === 1 && parts[0] === 'library') return { name: 'library' }
  if (parts.length === 1 && parts[0] === 'signin') return { name: 'signin' }
  if (parts[0] === 'h' && parts[1]) {
    const id = parts[1]
    if (parts.length === 2) return { name: 'handbook', id }
    const n = Number(parts[3])
    const validChapter = parts[2] === 'chapter' && Number.isInteger(n) && n >= 1 && n <= 7
    if (validChapter && parts.length === 4) return { name: 'chapter', id, n }
    if (validChapter && parts.length === 5 && parts[4] === 'done') return { name: 'done', id, n }
    if (validChapter && parts.length === 5 && parts[4] === 'deeper') return { name: 'deeper', id, n }
  }
  return { name: 'notFound' }
}

const NAVIGATE_EVENT = 'igetit:navigate'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE_EVENT, onChange)
  }
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

// `state` rides along in history (not the address), e.g. the line to keep on "Change the line".
export function navigate(to: string, { replace = false, state }: { replace?: boolean; state?: unknown } = {}) {
  if (replace) window.history.replaceState(state ?? null, '', to)
  else window.history.pushState(state ?? null, '', to)
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
  window.scrollTo({ top: 0 })
}

export function navState<T>(): T | null {
  return (window.history.state as T | null) ?? null
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

// A real link (long-press, open in new tab and copy all work), handled in the page on a plain tap.
export function Link({ to, onClick, ...rest }: LinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return createElement('a', { href: to, onClick: handleClick, ...rest })
}
