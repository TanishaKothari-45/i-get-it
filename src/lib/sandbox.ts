// Model-written pages (move figures, try-it explainers) run in an iframe with sandbox="allow-scripts" only, via srcdoc.
// This adds a Content-Security-Policy inside the page so its code can't fetch, post, or load anything from the network:
// scripts and styles inline only, images only as data: URIs. (8 Oct, from the other session's security check.)
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'">`
export function lockDown(html: string): string {
  const h = html.replace(/<meta[^>]+content-security-policy[^>]*>/gi, '')
  if (/<head[^>]*>/i.test(h)) return h.replace(/<head[^>]*>/i, (m) => `${m}${CSP}`)
  if (/<html[^>]*>/i.test(h)) return h.replace(/<html[^>]*>/i, (m) => `${m}<head>${CSP}</head>`)
  return `${CSP}${h}`
}
