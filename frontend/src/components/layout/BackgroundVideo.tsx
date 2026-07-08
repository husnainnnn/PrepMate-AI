const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4'

/**
 * Fullscreen looping background video. This alone provides the page's
 * visual depth -- no gradients or overlays are layered on top of it.
 */
export function BackgroundVideo() {
  return (
    <video
      className="absolute inset-0 w-full h-full object-cover z-0"
      src={VIDEO_SRC}
      autoPlay
      muted
      loop
      playsInline
    />
  )
}
