import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic, Video, VideoOff, MicOff, Monitor, Phone, PhoneOff,
  Calendar, Clock, Plus, X, ChevronRight, Search, Loader2,
  Briefcase, Star, Ban, UserCheck, CheckCircle, XCircle,
  Mail, MessageSquare,
} from "lucide-react";
import { CompanyDashboardLayout } from "@/components/company/CompanyDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

// --- Types ---

interface Interview {
  _id: string;
  companyId: string;
  studentId: string;
  applicationId: string | null;
  jobId: string | null;
  jobTitle: string;
  companyName: string;
  studentName: string;
  studentEmail: string;
  scheduledTime: string;
  durationMinutes: number;
  notes: string;
  roomId: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  cancelledBy: string;
  cancelReason: string;
  feedback: string;
  rating: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  studentDetails?: {
    _id: string;
    fullName: string;
    email: string;
    field: string;
    skills: string[];
  } | null;
}

interface ShortlistedCandidate {
  applicationId: string;
  studentId: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  field: string;
  skills: string[];
  currentStage: string;
}

// --- Helpers ---

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    "in-progress": "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-gray-50 text-gray-600 border-gray-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
  };
  return map[status] || "bg-gray-50 text-gray-600 border-gray-100";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: "Scheduled",
    "in-progress": "Live Now",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] || status;
}

// --- Skeleton ---
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className || ""}`} />;
}

// --- Schedule Interview Modal ---
function ScheduleModal({
  candidates,
  onClose,
  onSchedule,
  scheduling,
}: {
  candidates: ShortlistedCandidate[];
  onClose: () => void;
  onSchedule: (data: {
    studentId: string;
    applicationId: string;
    jobId: string;
    jobTitle: string;
    scheduledTime: string;
    durationMinutes: number;
    notes: string;
  }) => void;
  scheduling: boolean;
}) {
  const [selectedCandidate, setSelectedCandidate] = useState<ShortlistedCandidate | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCandidates = candidates.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.fullName?.toLowerCase().includes(q) || c.jobTitle?.toLowerCase().includes(q);
  });

  const handleSubmit = () => {
    if (!selectedCandidate || !date || !time) return;
    onSchedule({
      studentId: selectedCandidate.studentId,
      applicationId: selectedCandidate.applicationId,
      jobId: selectedCandidate.jobId,
      jobTitle: selectedCandidate.jobTitle,
      scheduledTime: `${date}T${time}:00`,
      durationMinutes: duration,
      notes,
    });
  };

  // Set default date+time to tomorrow at current hour+1
  useEffect(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    setDate(tomorrow.toISOString().split("T")[0]);
    setTime(`${String(tomorrow.getHours() + 1).padStart(2, "0")}:00`);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAECF0] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Calendar className="h-5 w-5 text-[#1a6fa8]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#101828]">Schedule Interview</h2>
              <p className="text-[12px] text-[#667085]">Select a candidate and set a time</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#667085] hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-5">
          {/* Candidate Selection */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-[#344054]">
              Select Candidate <span className="text-red-500">*</span>
            </label>
            {!selectedCandidate ? (
              <>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search candidates..."
                    className="h-9 w-full rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] pl-9 pr-3 text-[12.5px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                  />
                </div>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[#EAECF0] p-1">
                  {filteredCandidates.length === 0 ? (
                    <p className="py-4 text-center text-[12px] text-[#98A2B3]">No candidates found</p>
                  ) : (
                    filteredCandidates.map(c => (
                      <button
                        key={c.applicationId}
                        onClick={() => setSelectedCandidate(c)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-blue-50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-[#1a6fa8]">
                          {getInitials(c.fullName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-[#101828] truncate">{c.fullName}</p>
                          <p className="text-[11px] text-[#667085] truncate">{c.jobTitle}{c.field ? (' - ' + c.field) : ""}</p>
                        </div>
                        <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700">
                          <Star className="h-3 w-3 mr-0.5" /> {c.currentStage}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-[#1a6fa8]/20 bg-blue-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a6fa8] text-[13px] font-semibold text-white">
                  {getInitials(selectedCandidate.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-[#101828]">{selectedCandidate.fullName}</p>
                  <p className="text-[12px] text-[#667085]">{selectedCandidate.jobTitle}</p>
                </div>
                <button onClick={() => setSelectedCandidate(null)} className="text-[11px] font-medium text-[#1a6fa8] hover:underline">
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-[#344054]">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-[12.5px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-[#344054]">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-[12.5px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-[#344054]">Duration</label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map(m => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`flex-1 rounded-lg border py-2 text-[12px] font-medium transition-all ${
                    duration === m
                      ? "border-[#1a6fa8] bg-blue-50 text-[#1a6fa8]"
                      : "border-[#EAECF0] text-[#667085] hover:border-[#D0D5DD]"
                  }`}
                >
                  {m < 60 ? `${m}min` : `${m / 60}h`}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-[#344054]">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any instructions or topics for the interview..."
              rows={2}
              className="w-full resize-none rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-[12.5px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#EAECF0] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#EAECF0] px-4 py-2 text-[12.5px] font-medium text-[#667085] transition-colors hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCandidate || !date || !time || scheduling}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {scheduling ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling...</>
            ) : (
              <><Calendar className="h-4 w-4" /> Schedule Interview</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Cancel Modal ---
function CancelModal({
  interview,
  onClose,
  onCancel,
  cancelling,
}: {
  interview: Interview;
  onClose: () => void;
  onCancel: (reason: string) => void;
  cancelling: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <Ban className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="mt-3 text-center text-[15px] font-semibold text-[#101828]">Cancel Interview?</h3>
        <p className="mt-1 text-center text-[12.5px] text-[#667085]">
          Cancel interview with <strong>{interview.studentName}</strong> for {interview.jobTitle}?
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)..."
          rows={2}
          className="mt-4 w-full resize-none rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-[12.5px] text-[#101828] outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 placeholder:text-[#98A2B3]"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-[#EAECF0] px-4 py-2.5 text-[12.5px] font-medium text-[#667085] transition-colors hover:bg-gray-50">
            Keep
          </button>
          <button
            onClick={() => onCancel(reason)}
            disabled={cancelling}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-[12.5px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Video Room ---
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function VideoRoom({
  interview,
  onEnd,
}: {
  interview: Interview;
  onEnd: () => void;
}) {
  const [status, setStatus] = useState<"requesting-media" | "ready" | "connecting" | "connected" | "ended">("requesting-media");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const { token, user } = useAuth();

  // Get media
  useEffect(() => {
    if (status !== "requesting-media") return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setStatus("ready");
      } catch {
        setErrorMsg("Camera or microphone access denied.");
        setStatus("ended");
      }
    })();

    return () => { cancelled = true; };
  }, [status]);

  // Join room
  const joinRoom = useCallback(async () => {
    if (!localStreamRef.current) return;
    setStatus("connecting");

    const socket = (await import("socket.io-client")).io("http://localhost:3001");
    socketRef.current = socket;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = event => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      setRemoteJoined(true);
      setStatus("connected");
    };

    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId: interview.roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setErrorMsg("Connection lost.");
      }
    };

    socket.on("connect", () => {
      socket.emit("join-room", {
        roomId: interview.roomId,
        userId: user?.id || user?._id,
        userName: "Interviewer",
      });
    });

    socket.on("offer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { roomId: interview.roomId, sdp: answer });
    });

    socket.on("answer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch { /* ignore */ }
    });

    socket.on("ready-to-offer", async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId: interview.roomId, sdp: offer });
    });

    socket.on("peer-left", () => {
      setRemoteJoined(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    });
  }, [interview.roomId, user]);

  // Cleanup
  useEffect(() => {
    return () => {
      pcRef.current?.close();
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Controls
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCameraOn(track.enabled);
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setIsScreenSharing(true);
      screenTrack.onended = () => stopScreenShare();
    } catch { /* user cancelled */ }
  };

  const stopScreenShare = async () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    const camTrack = cameraTrackRef.current;
    const sender = pcRef.current?.getSenders().find(s => s.track?.kind === "video");
    if (sender && camTrack) await sender.replaceTrack(camTrack);
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  const endCall = async () => {
    socketRef.current?.emit("leave-room", { roomId: interview.roomId });
    socketRef.current?.disconnect();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());

    // Mark as completed
    if (token) {
      try {
        await fetch(`/api/live-interviews/${interview._id}/complete`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ feedback, rating }),
        });
      } catch { /* ignore */ }
    }

    setStatus("ended");
  };

  if (status === "ended") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
          <PhoneOff className="mx-auto h-12 w-12 text-[#1a6fa8]" />
          <h2 className="mt-3 text-xl font-semibold text-[#101828]">Interview Ended</h2>
          <p className="mt-1 text-[13px] text-[#667085]">
            Interview with <strong>{interview.studentName}</strong> has ended.
          </p>

          {/* Feedback */}
          <div className="mt-5 space-y-3 text-left">
            <div>
              <label className="text-[12.5px] font-medium text-[#344054]">Rating</label>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(n)} className="p-1">
                    <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-[#D0D5DD]"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12.5px] font-medium text-[#344054]">Feedback notes</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Any notes on this candidate..."
                rows={2}
                className="mt-1 w-full resize-none rounded-lg border border-[#D0D5DD] px-3 py-2 text-[12.5px] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
              />
            </div>
          </div>

          <button
            onClick={async () => {
              if (token && (feedback || rating)) {
                setSubmitting(true);
                try {
                  await fetch(`/api/live-interviews/${interview._id}/complete`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ feedback, rating }),
                  });
                } catch { /* ignore */ }
                setSubmitting(false);
              }
              onEnd();
            }}
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110"
          >
            {submitting ? "Saving..." : "Done — Back to Interviews"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f172a]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#1e293b] px-4 py-2">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
            {getInitials(interview.studentName)}
          </div>
          <span className="text-[13px] font-medium">{interview.studentName}</span>
          <span className="text-[11px] text-[#94a3b8]">{' \u00B7 '}{interview.jobTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {remoteJoined && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          <button onClick={() => { if (!showEndConfirm) setShowEndConfirm(true); }} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/30">
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
                <p className="mt-2 text-[13px] text-[#94a3b8]">Waiting for {interview.studentName} to join...</p>
              </div>
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white">
            {interview.studentName} {!remoteJoined ? "(not joined)" : ""}
          </span>
        </div>

        <div className="relative flex w-[280px] items-center justify-center overflow-hidden rounded-xl bg-[#1e293b]">
          <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white">
            You {isScreenSharing ? "(sharing screen)" : ""}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 bg-[#1e293b] px-4 pb-4 pt-2">
        {status === "ready" && (
          <button onClick={joinRoom} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500">
            <Phone className="h-4 w-4" /> Join Interview
          </button>
        )}

        {(status === "connecting" || status === "connected") && (
          <div className="flex items-center gap-2">
            <button onClick={toggleMic} className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all ${isMicOn ? "bg-[#334155] hover:bg-[#475569]" : "bg-rose-600 hover:bg-rose-500"}`}>
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span className="text-[12px]">{isMicOn ? "Mic" : "Muted"}</span>
            </button>

            <button onClick={toggleCamera} className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all ${isCameraOn ? "bg-[#334155] hover:bg-[#475569]" : "bg-rose-600 hover:bg-rose-500"}`}>
              {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              <span className="text-[12px]">{isCameraOn ? "Camera" : "Off"}</span>
            </button>

            <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all ${isScreenSharing ? "bg-[#1a6fa8] hover:bg-[#1a84c4]" : "bg-[#334155] hover:bg-[#475569]"}`}>
              <Monitor className="h-4 w-4" />
              <span className="text-[12px]">{isScreenSharing ? "Stop Share" : "Share"}</span>
            </button>

            <button onClick={() => setShowEndConfirm(true)} className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-500">
              <PhoneOff className="h-4 w-4" /> End
            </button>
          </div>
        )}
      </div>

      {/* End confirmation */}
      {showEndConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="mx-4 w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-[15px] font-semibold text-[#101828]">End Interview?</h3>
            <p className="mt-1 text-[12.5px] text-[#667085]">This will disconnect all participants.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 rounded-lg border border-[#EAECF0] px-4 py-2.5 text-[12.5px] font-medium text-[#667085]">
                Cancel
              </button>
              <button onClick={endCall} className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-[12.5px] font-medium text-white">
                End Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connecting overlay */}
      {status === "connecting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5">
          <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#1a6fa8]" />
            <p className="mt-3 text-[14px] font-medium text-[#101828]">Connecting to interview...</p>
            <p className="mt-1 text-[13px] text-[#667085]">Establishing secure connection</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Past Tab Component ---
function PastTab({
  past,
  pastFilter,
  setPastFilter,
  token,
  onHireSuccess,
  onRefresh,
}: {
  past: Interview[];
  pastFilter: "all" | "hired" | "rejected" | "undecided";
  setPastFilter: (f: "all" | "hired" | "rejected" | "undecided") => void;
  token: string | null;
  onHireSuccess: (name: string, email: string) => void;
  onRefresh: () => void;
}) {
  // Group interviews by studentId
  const studentGroups: Record<string, { studentName: string; studentEmail: string; interviews: Interview[]; decision: string | null; applicationId: string | null }> = {};
  past.forEach(iv => {
    const sId = iv.studentId || 'unknown';
    if (!studentGroups[sId]) {
      studentGroups[sId] = {
        studentName: iv.studentName,
        studentEmail: iv.studentEmail,
        interviews: [],
        decision: iv.applicationStage?.currentStage || null,
        applicationId: iv.applicationId,
      };
    }
    studentGroups[sId].interviews.push(iv);
    // Use most recent non-null applicationId
    if (iv.applicationId) {
      studentGroups[sId].applicationId = iv.applicationId;
    }
    // Update decision from latest interview
    if (iv.applicationStage?.currentStage) {
      studentGroups[sId].decision = iv.applicationStage.currentStage;
    }
  });

  // Sort each group's interviews by date (newest first)
  Object.values(studentGroups).forEach(g => {
    g.interviews.sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  });

  const allStudents = Object.values(studentGroups);
  const hiredStudents = allStudents.filter(s => s.decision === 'hired');
  const rejectedStudents = allStudents.filter(s => s.decision === 'rejected');
  const undecidedStudents = allStudents.filter(s => !s.decision || (s.decision !== 'hired' && s.decision !== 'rejected'));

  const filteredStudents = pastFilter === 'all' ? allStudents
    : pastFilter === 'hired' ? hiredStudents
    : pastFilter === 'rejected' ? rejectedStudents
    : undecidedStudents;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5">
        {[
          { key: "all" as const, label: "All", count: allStudents.length },
          { key: "hired" as const, label: "Hired", count: hiredStudents.length },
          { key: "rejected" as const, label: "Rejected", count: rejectedStudents.length },
          { key: "undecided" as const, label: "Yet to Decide", count: undecidedStudents.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setPastFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition-all ${
              pastFilter === tab.key
                ? "bg-[#101828] text-white shadow-sm"
                : "text-[#667085] hover:bg-[#F7F9FC]"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-10 w-10 text-[#D0D5DD]" strokeWidth={1.5} />
          <p className="mt-2 text-[13px] text-[#667085]">
            {pastFilter === "hired"
              ? "No hired candidates yet."
              : pastFilter === "rejected"
                ? "No rejected candidates."
                : "No undecided candidates."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map(group => {
            const isHired = group.decision === 'hired';
            const isRejected = group.decision === 'rejected';
            const totalRatings = group.interviews.filter(iv => iv.rating > 0).length;
            const avgRating = totalRatings > 0
              ? Math.round(group.interviews.reduce((sum, iv) => sum + iv.rating, 0) / totalRatings)
              : 0;
            const isExpanded = expandedId === group.interviews[0]?._id;

            return (
              <Card
                key={group.studentName + group.interviews.length}
                className={`rounded-xl border shadow-sm transition-all hover:shadow-md ${
                  isHired
                    ? "border-emerald-200 bg-emerald-50/30"
                    : isRejected
                      ? "border-red-200 bg-red-50/30"
                      : "border-[#EAECF0]"
                }`}
              >
                <CardContent className="p-4">
                  {/* Main student row - always visible */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                          isHired
                            ? "bg-emerald-100 text-emerald-600"
                            : isRejected
                              ? "bg-red-100 text-red-500"
                              : "bg-blue-50 text-[#1a6fa8]"
                        }`}
                      >
                        {isHired ? <CheckCircle className="h-5 w-5" /> : isRejected ? <XCircle className="h-5 w-5" /> : getInitials(group.studentName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-[#101828]">{group.studentName}</p>
                          <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isHired ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isRejected ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}>
                            {isHired ? 'Hired' : isRejected ? 'Rejected' : `${group.interviews.length} interview${group.interviews.length > 1 ? 's' : ''}`}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#667085]">
                          {group.interviews[0].jobTitle} {totalRatings > 0 && (
                            <span className="inline-flex items-center gap-0.5 ml-1">
                              {Array.from({ length: avgRating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                              <span className="text-[10px] text-[#98A2B3] ml-0.5">({totalRatings})</span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Expand/Collapse */}
                      {group.interviews.length > 1 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : (group.interviews[0]._id))}
                          className="rounded-lg border border-[#EAECF0] px-3 py-1.5 text-[11px] font-medium text-[#667085] transition-colors hover:bg-gray-50"
                        >
                          {isExpanded ? 'Collapse' : `View All (${group.interviews.length})`}
                        </button>
                      )}
                      {/* Hire/Reject buttons - at student level */}
                      {group.applicationId && !isHired && !isRejected && (
                        <>
                          <button
                            onClick={async () => {
                              if (!token) return;
                              try {
                                await fetch(`/api/company/applicants/${group.applicationId}/reject`, {
                                  method: "PATCH",
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                onRefresh();
                              } catch { /* ignore */ }
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-100"
                          >
                            <XCircle className="mr-1 inline h-3 w-3" /> Reject
                          </button>
                          <button
                            onClick={async () => {
                              if (!token) return;
                              try {
                                await fetch(`/api/company/applicants/${group.applicationId}/hire`, {
                                  method: "PATCH",
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                onHireSuccess(group.studentName, group.studentEmail);
                                onRefresh();
                              } catch { /* ignore */ }
                            }}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-600"
                          >
                            <CheckCircle className="h-3 w-3" /> Hire
                          </button>
                        </>
                      )}
                      {isHired && (
                        <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="h-3 w-3" /> Hired
                        </span>
                      )}
                      {isRejected && (
                        <span className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-600">
                          <XCircle className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded interview history */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 pl-[52px]">
                      {group.interviews.map((iv, idx) => (
                        <div key={iv._id} className="rounded-lg border border-[#EAECF0] bg-white p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-[#667085]">Session {idx + 1}</span>
                                <span className="text-[10px] text-[#D0D5DD]">|</span>
                                <span className="text-[11px] text-[#667085]">{iv.jobTitle}</span>
                                <span className="text-[10px] text-[#D0D5DD]">|</span>
                                <span className="text-[11px] text-[#667085]">{formatDateTime(iv.scheduledTime)}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                {/* Rating stars */}
                                {iv.rating > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: iv.rating }).map((_, i) => (
                                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    ))}
                                    <span className="text-[10px] text-[#98A2B3] ml-0.5">{iv.rating}/5</span>
                                  </div>
                                )}
                                {iv.status === 'cancelled' && (
                                  <span className="text-[10px] font-medium text-red-400">Cancelled</span>
                                )}
                              </div>
                              {iv.feedback && (
                                <p className="mt-1 text-[11px] text-[#98A2B3]">{iv.feedback}</p>
                              )}
                              {iv.cancelReason && (
                                <p className="mt-0.5 text-[10px] text-red-300">{iv.cancelReason}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// --- Main Page ---
export default function CompanyInterviewsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Interview[]>([]);
  const [inProgress, setInProgress] = useState<Interview[]>([]);
  const [past, setPast] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<ShortlistedCandidate[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [activeVideoRoom, setActiveVideoRoom] = useState<Interview | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Interview | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [hireSuccess, setHireSuccess] = useState<{ studentName: string; studentEmail: string } | null>(null);
  const [pastFilter, setPastFilter] = useState<"all" | "hired" | "rejected" | "undecided">("all");

  // Countdown timer for upcoming interviews (re-render every 30s)
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/live-interviews", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUpcoming(data.upcoming || []);
        setInProgress(data.inProgress || []);
        setPast(data.past || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchCandidates = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/live-interviews/shortlisted-candidates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchData(); }, [token]);
  useEffect(() => { if (showScheduleModal) fetchCandidates(); }, [showScheduleModal, token]);

  const handleSchedule = async (data: {
    studentId: string;
    applicationId: string;
    jobId: string;
    jobTitle: string;
    scheduledTime: string;
    durationMinutes: number;
    notes: string;
  }) => {
    if (!token) return;
    setScheduleLoading(true);
    try {
      const res = await fetch("/api/live-interviews/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowScheduleModal(false);
        fetchData();
      }
    } catch { /* ignore */ }
    setScheduleLoading(false);
  };

  const handleCancel = async (reason: string) => {
    if (!token || !cancelTarget) return;
    setCancelling(true);
    try {
      await fetch(`/api/live-interviews/${cancelTarget._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      setCancelTarget(null);
      fetchData();
    } catch { /* ignore */ }
    setCancelling(false);
  };

  const handleStartInterview = async (iv: Interview) => {
    if (!token) return;
    try {
      await fetch(`/api/live-interviews/${iv._id}/start`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }
    setActiveVideoRoom(iv);
  };

  const handleJoinNow = (iv: Interview) => {
    setActiveVideoRoom(iv);
  };

  // --- Video Room Active ---
  if (activeVideoRoom) {
    return (
      <VideoRoom
        interview={activeVideoRoom}
        onEnd={() => { setActiveVideoRoom(null); fetchData(); }}
      />
    );
  }

  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Live Interviews</h1>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              Schedule and conduct face-to-face video interviews with candidates.
            </p>
          </div>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Schedule Interview
          </button>
        </div>

        {/* Live Now Banner */}
        {inProgress.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3">
                  <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Live Interview{inProgress.length > 1 ? "s" : ""} in Progress</p>
                  <p className="text-[12px] text-emerald-600">{inProgress.length} interview{inProgress.length > 1 ? "s" : ""} active</p>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {inProgress.map(iv => (
                <div key={iv._id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-600">
                      {getInitials(iv.studentName)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#101828]">{iv.studentName}</p>
                      <p className="text-[11px] text-[#667085]">{iv.jobTitle}</p>
                    </div>
                  </div>
                  <button onClick={() => handleJoinNow(iv)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-600">
                    <Video className="h-3.5 w-3.5" /> Join Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-[#F7F9FC] p-1 w-fit">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === "upcoming" ? "bg-white text-[#101828] shadow-sm" : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            Upcoming ({upcoming.length + inProgress.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === "past" ? "bg-white text-[#101828] shadow-sm" : "text-[#667085] hover:text-[#101828]"
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
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeTab === "upcoming" ? (
          /* --- UPCOMING TAB --- */
          upcoming.length === 0 && inProgress.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-[#D0D5DD]" strokeWidth={1.5} />
              <h3 className="mt-3 text-[15px] font-semibold text-[#101828]">No upcoming interviews</h3>
              <p className="mt-1 text-[13px] text-[#667085]">
                Shortlist candidates first, then schedule a live video interview.
              </p>
              <button
                onClick={() => navigate("/company/shortlisted")}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#1a6fa8] px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-[#155a8a]"
              >
                <UserCheck className="h-4 w-4" /> View Shortlisted
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(iv => (
                <Card key={iv._id} className="rounded-xl border-[#EAECF0] shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[13px] font-semibold text-[#1a6fa8]">
                          {getInitials(iv.studentName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-medium text-[#101828]">{iv.studentName}</p>
                            <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(iv.status)}`}>
                              {statusLabel(iv.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[12px] text-[#667085]">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />{iv.jobTitle}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeUntil(iv.scheduledTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(iv.scheduledTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setCancelTarget(iv)}
                          className="rounded-lg border border-[#EAECF0] px-3 py-1.5 text-[11px] font-medium text-[#667085] transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleStartInterview(iv)}
                          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-1.5 text-[12px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110"
                        >
                          <Video className="h-3.5 w-3.5" /> Start Now
                        </button>
                      </div>
                    </div>
                    {iv.notes && (
                          <p className="mt-2 ml-[52px] text-[12px] text-[#98A2B3] italic">Notes: {iv.notes}</p>
                    )}
                    {iv.studentDetails && (
                      <div className="mt-2 ml-[52px] flex flex-wrap gap-1.5">
                        {iv.studentDetails.skills?.slice(0, 3).map(s => (
                          <span key={s} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-[#667085]">{s}</span>
                        ))}
                        {iv.studentDetails.skills?.length > 3 && (
                          <span className="text-[10px] text-[#98A2B3]">+{iv.studentDetails.skills.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
           /* --- PAST TAB --- */
          <PastTab
            past={past}
            pastFilter={pastFilter}
            setPastFilter={setPastFilter}
            token={token}
            onHireSuccess={(name, email) => setHireSuccess({ studentName: name, studentEmail: email })}
            onRefresh={fetchData}
          />
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          candidates={candidates}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleSchedule}
          scheduling={scheduleLoading}
        />
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          interview={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancel={handleCancel}
          cancelling={cancelling}
        />
      )}

      {/* Hire Success Popup */}
      {hireSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5" onClick={() => setHireSuccess(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#101828]">Hired!</h2>
            <p className="mt-2 text-[13px] text-[#667085]">
              <strong>{hireSuccess.studentName}</strong> has been notified about your decision.
            </p>
            <div className="mt-5 space-y-3 rounded-xl border border-[#EAECF0] bg-[#F7F9FC] p-4 text-left">
              <p className="text-[12.5px] font-medium text-[#344054]">Next steps — Contact the candidate:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[13px] text-[#667085]">
                  <Mail className="h-4 w-4 text-[#1a6fa8]" />
                  <a href={`mailto:${hireSuccess.studentEmail}`} className="text-[#1a6fa8] hover:underline">{hireSuccess.studentEmail}</a>
                </div>
                <button
                  onClick={() => {
                    setHireSuccess(null);
                    navigate('/company/messages');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110"
                >
                  <MessageSquare className="h-4 w-4" /> Message via PrepMate AI
                </button>
              </div>
            </div>
            <button
              onClick={() => setHireSuccess(null)}
              className="mt-4 w-full rounded-lg border border-[#EAECF0] px-4 py-2.5 text-[12.5px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </CompanyDashboardLayout>
  );
}
