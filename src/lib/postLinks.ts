/** URL + shared-Soul-post link helpers used when rendering chat message bodies. */

// Fresh regex per call (a shared /g regex carries lastIndex state between uses).
export const urlRe = () => /(https?:\/\/[^\s]+)/g

// Post links live at <origin><base>p/:id. The base is '/' in dev and a subpath on
// subpath deploys (e.g. /Project_A/ on GitHub Pages); legacy bare /p/ links already
// in the DB (old tunnel shares) must keep matching, so the base prefix is optional.
const BASE_PREFIX = import.meta.env.BASE_URL.replace(/\/$/, '')
const postRe = () => new RegExp(`^https?:\\/\\/[^/]+(?:${BASE_PREFIX})?\\/p\\/([\\w-]+)`)

/** The Soul post id in a single `…/p/:id` link, or null. */
export function postIdOf(url: string): string | null {
  return url.match(postRe())?.[1] ?? null
}

/** The shared Soul post id in a whole message (its first `…/p/:id` link), or null.
 *  Used by MessageBody (render the card) and MessageRow (widen the bubble for it). */
export function sharedPostIdOf(text: string): string | null {
  for (const m of text.matchAll(urlRe())) {
    const id = postIdOf(m[0])
    if (id) return id
  }
  return null
}
