/**
 * Returns the socket.io server URL based on the current hostname.
 * When accessed from another device on the same WiFi, the hostname
 * will be the local IP (e.g., 192.168.1.5), not "localhost".
 *
 * Vite proxy handles /api routes, but socket.io connects directly
 * to the backend port (3001), so we need the correct hostname.
 */
/**
 * Returns the socket.io server URL based on the current hostname.
 * When accessed from another device on the same WiFi, the hostname
 * will be the local IP (e.g., 192.168.1.5), not "localhost".
 */
export function getSocketUrl(): string {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'http://localhost:3001'
  }
  // Use same hostname as the page (works for localhost AND LAN IP)
  return `http://${window.location.hostname}:3001`
}

export const SOCKET_OPTIONS = { transports: ['websocket', 'polling'] as const }
