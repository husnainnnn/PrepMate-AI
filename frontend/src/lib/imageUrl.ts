/**
 * Normalize stored image URLs that may contain hardcoded "localhost:3001".
 *
 * When images are uploaded, the backend stores absolute URLs like:
 *   http://localhost:3001/uploads/uuid.png
 *
 * These break when:
 *   - The app is accessed from another device on the network
 *     (localhost points to the client, not the server)
 *   - The backend port or host changes
 *
 * This helper strips the hardcoded origin and returns a relative URL
 * that goes through the Vite proxy (/uploads → backend).
 *
 * @param url — The stored image URL (absolute or relative)
 * @returns A URL that works from any device on the network
 */
export function getImageUrl(url: string | undefined | null): string {
  if (!url) return ''

  // If it's already a relative path, use it as-is
  if (url.startsWith('/')) return url

  // If it's a data URL (base64), use it as-is
  if (url.startsWith('data:')) return url

  try {
    const parsed = new URL(url)
    // If it points to our own backend (localhost), make it relative
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return parsed.pathname + parsed.search + parsed.hash
    }
    // Otherwise it's an external URL — use it directly
    return url
  } catch {
    // Not a valid URL — return as-is
    return url
  }
}
