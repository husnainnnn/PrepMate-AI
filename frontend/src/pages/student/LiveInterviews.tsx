import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import {
  Video, VideoOff, Mic, MicOff, Monitor, Phone, PhoneOff,
  Clock, Loader2, Calendar, ChevronRight, Star,
  Building2, Briefcase,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Types ──────────────────────────────────────────────────

interface Interview {
  _id: string
  companyId: string
  studentId: string
  jobTitle: string
  companyName: string
  studentName: string
  scheduledTime: string
  durationMinutes: number
  notes: string
  roomId: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  cancelledBy: string
  cancelReason: string
  startedAt: string | null
  completedAt: string | null
  companyDetails?: {
    _id: string
    companyName: string
    email: string
    website: string
  } | null
}

type ConnectionStatus =
  | 'idle'
  | 'waiting-room'
  | 'requesting-media'
  | 'ready'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error'

interface ActiveRoom {
  interview: Interview
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

// ─── Helpers ────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  const hours = Math.floor(mins / 60)
  return `in ${hours}h ${mins % 60}m`
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    'in-progress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-gray-50 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  }
  return map[status] || 'bg-gray-50 text-gray-600 border-gray-100'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'Scheduled',
    'in-progress': 'Live Now',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return map[status] || status
}

// ─── Video Room ──────────────────────────────────────────────

function VideoRoom({
  interview,
  onEnd,
}: {
  interview: Interview
  onEnd: () => void
}) {
  const [status, setStatus] = useState<'requesting-media' | 'ready' | 'connecting' | 'connected' | 'ended'>('requesting-media')
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteJoined, setRemoteJoined] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<any>(null)
  const { token } = useAuth()

  // Get media
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
        setErrorMsg('Camera or microphone permission denied.')
        setStatus('ended')
      }
    })()

    return () => { cancelled = true }
  }, [status])

  // Join room
  const joinRoom = useCallback(async () => {
    if (!localStreamRef.current) return
    setStatus('connecting')

    const socket = (await import('socket.io-client')).io('http://localhost:3001')
    socketRef.current = socket

    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!)
    })

    pc.ontrack = event => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
      setRemoteJoined(true)
      setStatus('connected')
    }

    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId: interview.roomId, candidate: event.candidate })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setErrorMsg('Connection lost.')
      }
    }

    socket.on('connect', () => {
      socket.emit('join-room', { roomId: interview.roomId, userId: 'student', userName: interview.studentName })
    })

    socket.on('offer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', { roomId: interview.roomId, sdp: answer })
    })

    socket.on('answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch { /* ignore */ }
    })

    socket.on('ready-to-offer', async () => {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('offer', { roomId: interview.roomId, sdp: offer })
    })

    socket.on('peer-left', () => {
      setRemoteJoined(false)
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    })
  }, [interview.roomId, interview.studentName])

  useEffect(() => {
    return () => {
      pcRef.current?.close()
      socketRef.current?.disconnect()
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      screenStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

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

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = screenStream
      const screenTrack = screenStream.getVideoTracks()[0]
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
      setIsScreenSharing(true)
      screenTrack.onended = () => stopScreenShare()
    } catch { /* user cancelled */ }
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

  const endCall = () => {
    socketRef.current?.emit('leave-room', { roomId: interview.roomId })
    socketRef.current?.disconnect()
    pcRef.current?.close()
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())

    // Mark as completed
    if (token) {
      fetch(`/api/live-interviews/${interview._id}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }

    setStatus('ended')
  }

  if (status === 'ended') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
            <PhoneOff className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-[#101828]">Interview Ended</h2>
          <p className="mt-2 text-[13.5px] text-[#667085]">
            Thank you for your time — the interviewer will share feedback via messages.
          </p>
          <button onClick={onEnd} className="mt-6 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f172a]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#1e293b] px-4 py-2">
        <div className="flex items-center gap-2 text-white">
          <Building2 className="h-4 w-4 text-[#94a3b8]" />
          <span className="text-[13px] font-medium">{interview.companyName}</span>
          <span className="text-[11px] text-[#94a3b8]">· {interview.jobTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {remoteJoined && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          <button onClick={() => setShowEndConfirm(true)} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/30">
            <PhoneOff className="h-3.5 w-3.5 inline mr-1" />End
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex flex-1 gap-2 p-2">
        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#1e293b]">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          {!remoteJoined && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#64748b]" />
                <p className="mt-2 text-[13px] text-[#94a3b8]">Waiting for interviewer to join...</p>
              </div>
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white">
            Interviewer {!remoteJoined ? '(not joined)' : ''}
          </span>
        </div>

        <div className="relative flex w-[280px] items-center justify-center overflow-hidden rounded-xl bg-[#1e293b]">
          <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white">
            You {isScreenSharing ? '(sharing screen)' : ''}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 bg-[#1e293b] px-4 pb-4 pt-2">
        {status === 'ready' && (
          <button onClick={joinRoom} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500">
            <Phone className="h-4 w-4" /> Join Interview
          </button>
        )}

        {(status === 'connecting' || status === 'connected') && (
          <div className="flex items-center gap-2">
            <button onClick={toggleMic} className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all ${isMicOn ? 'bg-[#334155] hover:bg-[#475569]' : 'bg-rose-600 hover:bg-rose-500'}`}>
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span className="text-[12px]">{isMicOn ? 'Mic' : 'Muted'}</span>
            </button>
            <button onClick={toggleCamera} className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all ${isCameraOn ? 'bg-[#334155] hover:bg-[#475569]' : 'bg-rose-600 hover:bg-rose-500'}`}>
              {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              <span className="text-[12px]">{isCameraOn ? 'Camera' : 'Off'}</span>
            </button>
            <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all ${isScreenSharing ? 'bg-[#1a6fa8] hover:bg-[#1a84c4]' : 'bg-[#334155] hover:bg-[#475569]'}`}>
              <Monitor className="h-4 w-4" />
              <span className="text-[12px]">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
            </button>
            <button onClick={() => setShowEndConfirm(true)} className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-500">
              <PhoneOff className="h-4 w-4" /> End
            </button>
          </div>
        )}
      </div>

      {/* End confirmation */}
      {showEndConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-[15px] font-semibold text-[#101828]">Leave Interview?</h3>
            <p className="mt-1 text-[12.5px] text-[#667085]">You'll be disconnected from the call.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 rounded-lg border border-[#EAECF0] px-4 py-2.5 text-[12.5px] font-medium text-[#667085]">Cancel</button>
              <button onClick={endCall} className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-[12.5px] font-medium text-white">Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* Connecting overlay */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#1a6fa8]" />
            <p className="mt-3 text-[14px] font-medium text-[#101828]">Connecting...</p>
            <p className="mt-1 text-[13px] text-[#667085]">Establishing secure connection</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────

export default function LiveInterviewsPage() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState<Interview[]>([])
  const [inProgress, setInProgress] = useState<Interview[]>([])
  const [past, setPast] = useState<Interview[]>([])
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null)
  const [countdown, setCountdown] = useState('')
  const [waitingInterview, setWaitingInterview] = useState<Interview | null>(null)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  // Re-render every 30s to update relative times
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // Fetch interviews
  const fetchData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/live-interviews', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUpcoming(data.upcoming || [])
        setInProgress(data.inProgress || [])
        setPast(data.past || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [token])

  // ─── Socket.io — auto-refresh on new/cancelled interviews ───
  useEffect(() => {
    if (!token || !user) return

    let socket: any = null

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client')
        socket = io('http://localhost:3001')

        socket.on('connect', () => {
          socket.emit('join', user.id || user._id)
        })

        // New interview scheduled by company → auto-refresh
        socket.on('interview-scheduled', () => {
          fetchData()
        })

        // Interview started by company → auto-refresh
        socket.on('interview-started', () => {
          fetchData()
        })

        // Interview cancelled → auto-refresh
        socket.on('interview-cancelled', () => {
          fetchData()
        })
      } catch { /* socket unavailable */ }
    }

    connectSocket()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [token, user?.id, user?._id])

  // Auto-start countdown when clicking "Join"
  const handleJoinInterview = (iv: Interview) => {
    setWaitingInterview(iv)
  }

  // Countdown for waiting
  useEffect(() => {
    if (!waitingInterview) return
    const target = new Date(waitingInterview.scheduledTime).getTime()

    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) {
        setCountdown('')
        setWaitingInterview(null)
        setActiveRoom({ interview: waitingInterview })
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
  }, [waitingInterview])

  const handleStartNow = (iv: Interview) => {
    if (token) {
      fetch(`/api/live-interviews/${iv._id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    setActiveRoom({ interview: iv })
  }

  // ── Video Room Active ──────────────────────────────────
  if (activeRoom) {
    return (
      <VideoRoom
        interview={activeRoom.interview}
        onEnd={() => { setActiveRoom(null); fetchData() }}
      />
    )
  }

  return (
    <StudentDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3">
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

        {/* Live Now Banner */}
        {inProgress.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-3 w-3">
                <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <p className="text-sm font-semibold text-emerald-800">Live Interview in Progress</p>
            </div>
            {inProgress.map(iv => (
              <div key={iv._id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-600">
                    {getInitials(iv.companyName)}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#101828]">{iv.companyName}</p>
                    <p className="text-[11px] text-[#667085]">{iv.jobTitle}</p>
                  </div>
                </div>
                <button onClick={() => handleStartNow(iv)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-600">
                  <Video className="h-3.5 w-3.5" /> Join Now
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-[#F7F9FC] p-1 w-fit">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === 'upcoming' ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            Upcoming ({upcoming.length + inProgress.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === 'past' ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            Past ({past.length})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="rounded-xl border-[#EAECF0] shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeTab === 'upcoming' ? (
          upcoming.length === 0 && inProgress.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-[#F7F9FC]">
                <Video className="h-8 w-8 text-[#98A2B3]" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#101828]">No upcoming interviews</h2>
              <p className="mt-2 text-[13.5px] text-[#667085] max-w-md">
                When a company schedules a live interview with you, it will appear here.
                You'll receive a notification with the date, time, and joining link.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(iv => (
                <Card key={iv._id} className="rounded-xl border-[#EAECF0] shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[13px] font-semibold text-[#1a6fa8]">
                          {getInitials(iv.companyName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-medium text-[#101828]">{iv.companyName}</p>
                            <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(iv.status)}`}>
                              {statusLabel(iv.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[12px] text-[#667085]">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />{iv.jobTitle}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{timeUntil(iv.scheduledTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />{formatDateTime(iv.scheduledTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinInterview(iv)}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2 text-[12px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110"
                      >
                        <Video className="h-3.5 w-3.5" /> Join
                      </button>
                    </div>
                    {iv.notes && (
                      <p className="mt-2 ml-[52px] text-[12px] text-[#98A2B3] italic">📝 {iv.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          past.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-[#F7F9FC]">
                <Clock className="h-8 w-8 text-[#98A2B3]" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#101828]">No past interviews</h2>
              <p className="mt-2 text-[13.5px] text-[#667085]">Completed or cancelled interviews will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {past.map(iv => (
                <Card key={iv._id} className="rounded-xl border-[#EAECF0] shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          iv.status === 'completed' ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-500'
                        }`}>
                          {getInitials(iv.companyName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-[#101828]">{iv.companyName}</p>
                            <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(iv.status)}`}>
                              {statusLabel(iv.status)}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-[#667085]">
                            {iv.jobTitle} · {formatDateTime(iv.scheduledTime)}
                          </p>
                          {iv.cancelReason && (
                            <p className="text-[11px] text-red-400 mt-0.5">{iv.cancelReason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      {/* Waiting Room Modal */}
      {waitingInterview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#101828]">Interview starts in</h2>
            <div className="mt-4 text-4xl font-bold tracking-wider text-[#1a6fa8]">
              {countdown || '00:00:00'}
            </div>
            <p className="mt-2 text-[13px] text-[#667085]">
              {waitingInterview.companyName} · {waitingInterview.jobTitle}
            </p>
            <p className="mt-1 text-[12px] text-[#667085]">
              Be ready with your camera and microphone in a quiet space.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setWaitingInterview(null)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#EAECF0] bg-white px-5 py-3 text-sm font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]"
              >
                Close
              </button>
              <button
                onClick={() => handleStartNow(waitingInterview)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110"
              >
                <Video className="h-4 w-4" /> Join Now
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentDashboardLayout>
  )
}
