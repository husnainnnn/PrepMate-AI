import { useEffect, useRef, useState, useCallback } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { Video, VideoOff, Mic, MicOff, Monitor, Phone, PhoneOff, Clock, Loader2 } from 'lucide-react'

type ConnectionStatus =
  | 'idle'           // no interview scheduled — default page state
  | 'waiting-room'   // interview time not yet reached
  | 'requesting-media'
  | 'ready'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error'

interface ScheduledInterview {
  interviewId: string
  scheduledTime: string
  role: 'student' | 'interviewer'
  userName: string
  signalingServerUrl: string
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
}

export default function LiveInterviewsPage() {
  // ─── For now: use state instead of props (route doesn't pass props yet) ──
  const [activeInterview, setActiveInterview] = useState<ScheduledInterview | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteJoined, setRemoteJoined] = useState(false)
  const [countdown, setCountdown] = useState('')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<any | null>(null)

  // ─── Demo: simulate a scheduled interview ─────────────────────────────
  // In production, this would come from an API call or route params
  const scheduleDemoInterview = () => {
    const future = new Date(Date.now() + 30000) // 30 seconds from now
    setActiveInterview({
      interviewId: 'demo-interview-1',
      scheduledTime: future.toISOString(),
      role: 'student',
      userName: 'You',
      signalingServerUrl: 'https://api.yourapp.com',
    })
    setStatus('waiting-room')
  }

  // ─── Countdown timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'waiting-room' || !activeInterview) return
    const target = new Date(activeInterview.scheduledTime).getTime()

    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) {
        setStatus(prev => (prev === 'waiting-room' ? 'requesting-media' : prev))
        setCountdown('')
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [status, activeInterview])

  // ─── Camera + Mic permission ──────────────────────────────────────────
  useEffect(() => {
    if (status !== 'requesting-media') return

    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

        localStreamRef.current = stream
        cameraTrackRef.current = stream.getVideoTracks()[0] ?? null
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        setStatus('ready')
      } catch {
        setErrorMsg('Camera or microphone permission denied. Please allow access in your browser settings.')
        setStatus('error')
      }
    })()

    return () => { cancelled = true }
  }, [status])

  // ─── Join interview (Socket + WebRTC) ─────────────────────────────────
  const joinInterview = useCallback(async () => {
    if (!localStreamRef.current || !activeInterview) return
    setStatus('connecting')

    let ioModule
    try {
      // @vite-ignore
      ioModule = await import(/* @vite-ignore */ 'socket.io-client')
    } catch {
      setErrorMsg('Socket.io client not installed. Run: cd frontend && npm install socket.io-client')
      setStatus('error')
      return
    }
    const socket = ioModule.io(activeInterview.signalingServerUrl, {
      query: {
        interviewId: activeInterview.interviewId,
        role: activeInterview.role,
        userName: activeInterview.userName,
      },
    })
    socketRef.current = socket

    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current as MediaStream)
    })

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
      setRemoteJoined(true)
      setStatus('connected')
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          interviewId: activeInterview.interviewId,
          candidate: event.candidate,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setStatus('error')
        setErrorMsg('Connection lost. Please try again.')
      }
    }

    socket.on('connect', () => {
      socket.emit('join-room', {
        interviewId: activeInterview.interviewId,
        role: activeInterview.role,
        userName: activeInterview.userName,
      })
    })

    socket.on('offer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', { interviewId: activeInterview.interviewId, sdp: answer })
    })

    socket.on('answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) }
      catch (e) { console.error('ICE add error', e) }
    })

    socket.on('ready-to-offer', async () => {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('offer', { interviewId: activeInterview.interviewId, sdp: offer })
    })

    socket.on('peer-left', () => {
      setRemoteJoined(false)
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    })
  }, [activeInterview])

  // ─── Mic / Camera toggle ──────────────────────────────────────────────
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsMicOn(track.enabled)
  }

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsCameraOn(track.enabled)
  }

  // ─── Screen share ─────────────────────────────────────────────────────
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      screenStreamRef.current = screenStream
      const screenTrack = screenStream.getVideoTracks()[0]

      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
      setIsScreenSharing(true)
      screenTrack.onended = () => stopScreenShare()
    } catch (err) { console.error('Screen share error:', err) }
  }

  const stopScreenShare = async () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null

    const camTrack = cameraTrackRef.current
    const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
    if (sender && camTrack) await sender.replaceTrack(camTrack)
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
    setIsScreenSharing(false)
  }

  // ─── End call ─────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    if (activeInterview) socketRef.current?.emit('leave-room', { interviewId: activeInterview.interviewId })
    socketRef.current?.disconnect()
    setStatus('ended')
  }, [activeInterview])

  useEffect(() => {
    return () => {
      pcRef.current?.close()
      socketRef.current?.disconnect()
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      screenStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ─── Cancel interview ────────────────────────────────────────────────
  const cancelInterview = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    socketRef.current?.disconnect()
    setActiveInterview(null)
    setStatus('idle')
    setErrorMsg('')
    setCountdown('')
  }

  // ==================================================================
  // RENDER
  // ==================================================================

  // ─── IDLE: No interview scheduled ──────────────────────────────────
  if (status === 'idle') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[#101828]">Live Interviews</h1>
                <p className="text-[13px] text-[#667085]">
                  Face-to-face video interviews with company recruiters in real time.
                </p>
              </div>
            </div>

            {/* No interviews state */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-[#F7F9FC]">
                <Video className="h-8 w-8 text-[#98A2B3]" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#101828]">No upcoming interviews</h2>
              <p className="mt-2 text-[13.5px] text-[#667085] max-w-md mx-auto">
                When a company schedules a live interview with you, it will appear here.
                You'll receive a notification with the date, time, and joining link.
              </p>
              <div className="mt-6 flex flex-col items-center gap-4">
                <button
                  onClick={scheduleDemoInterview}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110"
                >
                  <Clock className="h-4 w-4" /> Try Demo Interview
                </button>
                <p className="text-[12px] text-[#98A2B3]">
                  Demo will start in 30 seconds (no backend required — shows the room UI)
                </p>
              </div>
            </div>

            {/* Info card */}
            <div className="mt-6 rounded-2xl border border-[#EAECF0] bg-gradient-to-br from-[#F7F9FC] to-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#101828]">How it works</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                {[
                  { step: '1', text: 'Company schedules an interview at a convenient time' },
                  { step: '2', text: 'Join the video room at the scheduled time' },
                  { step: '3', text: 'Interview live with camera, mic, and screen sharing' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] text-[11px] font-bold text-white">
                      {item.step}
                    </span>
                    <p className="text-[13px] text-[#667085]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  // ─── WAITING ROOM ────────────────────────────────────────────────
  if (status === 'waiting-room') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-[#101828]">Interview starts in</h2>
              <div className="mt-4 text-4xl font-bold tracking-wider text-[#1a6fa8]">
                {countdown || '00:00:00'}
              </div>
              <p className="mt-4 text-[13px] text-[#667085]">
                Please be ready with your camera and microphone. Find a quiet, well-lit space.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={cancelInterview}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#EAECF0] bg-white px-5 py-3 text-sm font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStatus('requesting-media')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110"
                >
                  Join Early <Video className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  // ─── REQUESTING MEDIA ───────────────────────────────────────────
  if (status === 'requesting-media') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-8 shadow-sm">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#1a6fa8]" />
              <p className="mt-4 text-[14px] text-[#667085]">Requesting camera and microphone access...</p>
            </div>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  // ─── ERROR ──────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <PhoneOff className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="mt-3 text-lg font-semibold text-red-700">Connection Error</h2>
              <p className="mt-2 text-[13px] text-red-600">{errorMsg}</p>
              <button
                onClick={cancelInterview}
                className="mt-5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  // ─── ENDED ──────────────────────────────────────────────────────
  if (status === 'ended') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
                <PhoneOff className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-[#101828]">Interview Ended</h2>
              <p className="mt-2 text-[13.5px] text-[#667085]">Thank you for your time. The interviewer will review and share feedback.</p>
              <button
                onClick={cancelInterview}
                className="mt-6 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  // ─── VIDEO ROOM (ready / connecting / connected) ─────────────────
  return (
    <div className="flex h-screen flex-col bg-[#0f172a]">
      {/* Video grid */}
      <div className="flex flex-1 gap-3 p-3">
        {/* Remote video (interviewer) */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#1e293b]">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          {!remoteJoined && (status === 'ready' || status === 'connecting') && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#64748b]" />
                <p className="mt-2 text-[13px] text-[#94a3b8]">Waiting for interviewer...</p>
              </div>
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[12px] text-white">
            Interviewer
          </span>
        </div>

        {/* Local video (you) */}
        <div className="relative flex w-[320px] items-center justify-center overflow-hidden rounded-xl bg-[#1e293b]">
          <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[12px] text-white">
            You {isScreenSharing ? '(sharing screen)' : ''}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 bg-[#0f172a] px-4 pb-6 pt-2">
        {/* Join button (shown in ready state) */}
        {status === 'ready' && (
          <button
            onClick={joinInterview}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500"
          >
            <Phone className="h-4 w-4" /> Join Interview
          </button>
        )}

        {/* Active call controls */}
        {(status === 'connecting' || status === 'connected') && (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMic}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
                isMicOn ? 'bg-[#334155] hover:bg-[#475569]' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {isMicOn ? 'Mic' : 'Muted'}
            </button>

            <button
              onClick={toggleCamera}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
                isCameraOn ? 'bg-[#334155] hover:bg-[#475569]' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              {isCameraOn ? 'Camera' : 'Off'}
            </button>

            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
                isScreenSharing ? 'bg-[#1a6fa8] hover:bg-[#1a84c4]' : 'bg-[#334155] hover:bg-[#475569]'
              }`}
            >
              <Monitor className="h-4 w-4" />
              {isScreenSharing ? 'Stop Share' : 'Share'}
            </button>

            <button
              onClick={endCall}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-rose-500"
            >
              <PhoneOff className="h-4 w-4" /> End Call
            </button>
          </div>
        )}
      </div>

      {/* Connecting overlay */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#1a6fa8]" />
            <p className="mt-3 text-[14px] font-medium text-[#101828]">Connecting to interview...</p>
            <p className="mt-1 text-[13px] text-[#667085]">Establishing secure connection</p>
          </div>
        </div>
      )}
    </div>
  )
}
