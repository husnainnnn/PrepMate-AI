import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Send,
  Search,
  Building2,
  Briefcase,
  Trash2,
} from "lucide-react";
import { StudentDashboardLayout } from "@/components/student/StudentDashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { io } from "socket.io-client";
import { getSocketUrl } from '@/lib/socketUrl'

// ─── Types ──────────────────────────────────────────────────

interface Conversation {
  otherId: string;
  otherRole: string;
  otherName: string;
  otherEmail: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
  jobTitle: string;
  companyName: string;
  applicationId: string | null;
}

interface ChatMessage {
  _id: string;
  senderId: string;
  senderRole: string;
  receiverId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

// ─── Helpers ────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Page ───────────────────────────────────────────────────

export default function StudentMessages() {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingMsg, setDeletingMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvRef = useRef<Conversation | null>(null);
  // Keep ref in sync with state so socket handler reads latest value
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // Fetch conversations
  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchConversations(); }, [token]);

  // ─── Socket.io real-time messages ────────────────────────
  useEffect(() => {
    if (!token || !user) return;
    const socket = io(getSocketUrl());

    socket.on('connect', () => {
      socket.emit('join', user.id || user._id, token);
    });

    socket.on('new-message', (msg: ChatMessage) => {
      // Use ref to read latest activeConv (avoid stale closure)
      const conv = activeConvRef.current;
      if (conv && msg.senderId === conv.otherId) {
        setChatMessages(prev => [...prev, msg]);
      }
      // Refresh conversations list to update last message & unread count
      fetchConversations();
    });

    return () => { socket.disconnect(); };
  }, [token, user?.id, user?._id]);

  // Fetch chat messages when a conversation is selected
  useEffect(() => {
    if (!activeConv || !token) return;
    setChatLoading(true);
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages/${activeConv.otherId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setChatMessages(data.messages || []);
        }
      } catch { /* ignore */ }
      setChatLoading(false);
      // Mark as read
      try {
        await fetch(`/api/messages/read/${activeConv.otherId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
        setConversations(prev => prev.map(c =>
          c.otherId === activeConv.otherId ? { ...c, unreadCount: 0 } : c
        ));
      } catch { /* ignore */ }
    };
    fetchMessages();
  }, [activeConv?.otherId, token]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!token || !activeConv || !messageText.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: activeConv.otherId,
          receiverRole: 'company',
          applicationId: activeConv.applicationId,
          jobTitle: activeConv.jobTitle,
          companyName: activeConv.companyName,
          content: messageText.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, data.message]);
        setMessageText('');
        setConversations(prev => prev.map(c =>
          c.otherId === activeConv.otherId
            ? { ...c, lastMessage: data.message.content, lastMessageDate: data.message.createdAt }
            : c
        ));
        setConversations(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(c => c.otherId === activeConv.otherId);
          if (idx > 0) {
            const [item] = updated.splice(idx, 1);
            updated.unshift(item);
          }
          return updated;
        });
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.otherName?.toLowerCase().includes(q) || c.jobTitle?.toLowerCase().includes(q) || c.companyName?.toLowerCase().includes(q);
  });

  return (
    <StudentDashboardLayout>
      <div className="flex h-[calc(100vh-73px)]">
        {/* ── Left Panel: Conversation List ──────────────── */}
        <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 md:shrink-0 flex-col border-r border-[#EAECF0] bg-white`}>
          <div className="p-4 border-b border-[#EAECF0]">
            <h1 className="text-lg font-semibold text-[#101828]">Messages</h1>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-9 w-full rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] pl-9 pr-3 text-[12.5px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-1 p-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                      <div className="h-2.5 w-24 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageSquare className="h-8 w-8 text-[#D0D5DD]" strokeWidth={1.5} />
                <p className="mt-3 text-[13px] font-medium text-[#667085]">No messages yet</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">Companies will message you here when they shortlist or hire you.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.otherId}
                  onClick={() => setActiveConv(conv)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/80 ${
                    activeConv?.otherId === conv.otherId ? 'bg-blue-50/50 border-l-2 border-[#1a6fa8]' : ''
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                    activeConv?.otherId === conv.otherId ? 'bg-[#1a6fa8] text-white' : 'bg-gray-100 text-[#667085]'
                  }`}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-[#101828] truncate">{conv.companyName || conv.otherName || 'Company'}</p>
                      <span className="text-[10px] text-[#98A2B3] shrink-0">{formatTime(conv.lastMessageDate)}</span>
                    </div>
                    <p className="text-[12px] text-[#667085] truncate mt-0.5">{conv.lastMessage}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="h-3 w-3 text-[#98A2B3]" />
                      <span className="text-[10px] text-[#98A2B3] truncate">{conv.jobTitle || 'Job'}</span>
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a6fa8] text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel: Chat ──────────────────────────── */}
        <div className={`${activeConv ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white`}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-[#EAECF0] px-5 py-3">
                {/* Back button — mobile only */}
                <button
                  onClick={() => setActiveConv(null)}
                  className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-[#667085] hover:bg-gray-100 transition-colors shrink-0"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a6fa8] text-white shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-[#101828]">{activeConv.companyName || activeConv.otherName || 'Company'}</p>
                  <p className="text-[11px] text-[#667085] truncate">{activeConv.jobTitle}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {chatLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#EAECF0] border-t-[#1a6fa8]" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-10 w-10 text-[#D0D5DD]" strokeWidth={1.5} />
                    <p className="mt-3 text-[13px] font-medium text-[#667085]">No messages yet</p>
                    <p className="mt-1 text-[11px] text-[#98A2B3]">The company will reach out to you here.</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isStudent = msg.senderRole === 'student';
                    return (
                      <div key={msg._id} className={`group flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                        <div className="relative max-w-[75%]">
                          <div className={`rounded-2xl px-4 py-2.5 ${
                            isStudent
                              ? 'bg-[#1a6fa8] text-white rounded-br-md'
                              : 'bg-gray-100 text-[#344054] rounded-bl-md'
                          }`}>
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <div className="flex items-center gap-2 mt-1 justify-between">
                              <p className={`text-[10px] ${isStudent ? 'text-blue-200' : 'text-[#98A2B3]'}`}>
                                {formatTime(msg.createdAt)}
                              </p>
                              {isStudent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(msg);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-300 hover:text-red-200"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-[#EAECF0] p-4">
                <div className="flex items-center gap-2">
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a reply..."
                    className="flex-1 rounded-lg border border-[#D0D5DD] px-4 py-2.5 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !messageText.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a6fa8] text-white transition-colors hover:bg-[#155a8a] disabled:opacity-40"
                  >
                    {sending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ── No conversation selected ───────────────── */
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <MessageSquare className="h-8 w-8 text-[#1a6fa8]" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[#101828]">Your Messages</h2>
                <p className="mt-1 text-[13px] text-[#667085] max-w-xs">
                  Companies will message you here about your applications.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ── Delete Confirmation Modal ──────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="mt-4 text-center text-[15px] font-semibold text-[#101828]">
              Delete this message?
            </h3>
            <p className="mt-1 text-center text-[12.5px] text-[#667085]">
              This will permanently delete this message from the chat.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-[#EAECF0] px-4 py-2.5 text-[12.5px] font-medium text-[#667085] transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!token) return;
                  setDeletingMsg(deleteTarget._id);
                  try {
                    await fetch(`/api/messages/${deleteTarget._id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    setChatMessages(prev => prev.filter(m => m._id !== deleteTarget._id));
                    setDeleteTarget(null);
                  } catch { /* ignore */ }
                  setDeletingMsg(null);
                }}
                disabled={deletingMsg === deleteTarget._id}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-[12.5px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {deletingMsg === deleteTarget._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentDashboardLayout>
  );
}
