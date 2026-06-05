/** URL + shared-Soul-post link helpers used when rendering chat message bodies. */

// Fresh regex per call (a shared /g regex carries lastIndex state between uses).
export const urlRe = () => /(https?:\/\/[^\s]+)/g

/** The Soul post id in a single `…/p/:id` link, or null. */
export function postIdOf(url: string): string | null {
  return url.match(/^https?:\/\/[^/]+\/p\/([\w-]+)/)?.[1] ?? null
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
