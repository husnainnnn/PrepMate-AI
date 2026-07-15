const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4'

/**
 * Fullscreen looping background video on all screen sizes.
 */
export function BackgroundVideo() {
  return (
    <>
      {/* Fullscreen looping background video on all screen sizes */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        src={VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
      />
    </>
  )
}
