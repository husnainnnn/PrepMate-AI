const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4'

const POSTER_IMAGE =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80'

/**
 * Fullscreen looping background video on desktop,
 * static poster image on mobile to save bandwidth & avoid lag.
 */
export function BackgroundVideo() {
  return (
    <>
      {/* Mobile: static background image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: `url(${POSTER_IMAGE})` }}
      />
      {/* Desktop: full video */}
      <video
        className="absolute inset-0 hidden md:block w-full h-full object-cover z-0"
        src={VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
      />
    </>
  )
}
