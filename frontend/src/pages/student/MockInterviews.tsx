import { useState, useRef, useEffect, useCallback } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import {
  Mic, ChevronRight, Sparkles, RotateCcw, Camera, Send,
  ThumbsUp, ThumbsDown, AlertTriangle, Volume2, SkipForward,
  Gavel, Eye, ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  fetchQuestions,
  fetchFollowUp,
  fetchAnalysis,
  type ExperienceLevel,
  type InterviewQuestion,
  type AnswerRecord,
  type AnalysisResult,
} from '@/services/mockInterviewData'

const FREE_PLAN_LIMIT = 4
const TOTAL_QUESTIONS_MIN = 9
const TOTAL_QUESTIONS_MAX = 13
const WORD_THRESHOLD = 20
const SILENCE_TIMEOUT_MS = 3500   // auto-submit after this much silence
const TYPEWRITER_SPEED_MS = 35    // ms per character in typewriter
const TAB_VIOLATION_LIMIT = 3     // 3rd tab switch → cancel as cheating

type Stage = 'setup' | 'permission' | 'interview' | 'followup' | 'analyzing' | 'report' | 'locked' | 'cheated'

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'so']

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countFillerWords(text: string): number {
  const lower = text.toLowerCase()
  return FILLER_WORDS.reduce((count, word) => {
    const regex = new RegExp('\\b' + escapeRegex(word) + '\\b', 'gi')
    const matches = lower.match(regex)
    return count + (matches ? matches.length : 0)
  }, 0)
}

function isAnswerGood(transcript: string): boolean {
  const words = transcript.trim().split(/\s+/).filter(Boolean)
  return words.length >= WORD_THRESHOLD
}

/** Extract key terms from a question for relevance checking */
function extractKeyTerms(question: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'like',
    'through', 'after', 'over', 'between', 'out', 'against', 'during',
    'without', 'before', 'under', 'around', 'among', 'what', 'which',
    'who', 'whom', 'this', 'that', 'these', 'those', 'it', 'its',
    'you', 'your', 'they', 'their', 'them', 'tell', 'describe', 'explain',
    'how', 'why', 'when', 'where', 'give', 'walk', 'share', 'talk',
    'about', 'and', 'or', 'but', 'if', 'so', 'because', 'then', 'than',
    'very', 'just', 'also', 'more', 'some', 'any', 'each', 'every',
    'both', 'much', 'many', 'such', 'only', 'own', 'same', 'here',
    'there', 'back', 'still', 'well', 'way', 'think', 'make', 'take',
  ])
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
}

/** Check answer relevance: what % of question key terms appear in answer */
function checkRelevance(question: string, answer: string): boolean {
  const terms = extractKeyTerms(question)
  if (terms.length === 0) return true // can't judge, assume relevant
  const lowerAnswer = answer.toLowerCase()
  const matched = terms.filter(t => lowerAnswer.includes(t))
  const ratio = matched.length / terms.length
  return ratio >= 0.15 // at least 15% key terms matched
}

interface TopicWeakness {
  topic: string
  askedCount: number
}

export default function MockInterviewsPage() {
  const [stage, setStage] = useState<Stage>('setup')
  const [usageCount, setUsageCount] = useState<number>(0)

  // Setup form
  const [field, setField] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [experience, setExperience] = useState<ExperienceLevel>('fresher')
  const [introduction, setIntroduction] = useState('')

  // Interview state
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [liveTranscript, setLiveTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // ─── New State ───────────────────────────────────────────
  const totalQuestions = useRef(
    Math.floor(Math.random() * (TOTAL_QUESTIONS_MAX - TOTAL_QUESTIONS_MIN + 1)) + TOTAL_QUESTIONS_MIN
  )
  const [visibleQuestionText, setVisibleQuestionText] = useState('')    // typewriter
  const [showTypewriter, setShowTypewriter] = useState(true)
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(Date.now())
  const [isSpeakingAnswer, setIsSpeakingAnswer] = useState(false)       // user is currently speaking
  const [questionEndTime, setQuestionEndTime] = useState<number | null>(null) // when TTS finished / question fully shown
  const [answerStartTime, setAnswerStartTime] = useState<number | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [tabViolations, setTabViolations] = useState(0)
  const [cheatingWarning, setCheatingWarning] = useState<string | null>(null)
  const [autoSubmitting, setAutoSubmitting] = useState(false)

  // Follow-up question
  const [currentFollowUp, setCurrentFollowUp] = useState<InterviewQuestion | null>(null)

  // Smart interviewer
  const [topicWeaknesses, setTopicWeaknesses] = useState<TopicWeakness[]>([])

  // Analysis
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const { token } = useAuth()

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any | null>(null)
  const typewriterRef = useRef<number | null>(null)
  const autoSubmitPendingRef = useRef(false)
  const handleSubmitRef = useRef<(() => void) | null>(null)
  const cancelInterviewRef = useRef<(() => void) | null>(null)
  const startRecognitionRef = useRef<(() => void) | null>(null)
  const stopTypewriterCleanupRef = useRef<(() => void) | null>(null)

  // Refs for stable recognition handlers (avoid stale closures)
  const answerStartTimeRef = useRef<number | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())
  const stageRef = useRef<Stage>('setup')

  // Profile autofill
  useEffect(() => {
    if (!token) return
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const user = await res.json()
          if (user.field) setField(user.field)
          if (user.skills?.length > 0) setSkillsInput(user.skills.join(', '))
          if (user.experience) setExperience(user.experience)
        }
      } catch { /* no backend */ }
    }
    loadProfile()
  }, [token])

  // ─── TTS ─────────────────────────────────────────────────
  // Pre-load voices so they're available on first speak call
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Force Chrome to load voices by calling getVoices() early
      window.speechSynthesis.getVoices()
    }
  }, [])

  const speakQuestion = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      setShowTypewriter(false)
      setVisibleQuestionText(text)
      setQuestionEndTime(Date.now())
      setIsSpeaking(false)
      onEnd?.()
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    // Set a proper English voice
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService) || voices.find(v => v.lang.startsWith('en'))
    if (englishVoice) utterance.voice = englishVoice

    let finished = false
    let fallbackTimer: number | null = null

    const safeOnDone = () => {
      if (finished) return
      finished = true
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer)
      setIsSpeaking(false)
      setShowTypewriter(false)
      setVisibleQuestionText(text)
      setQuestionEndTime(Date.now())
      onEnd?.()
    }

    utterance.onstart = () => {
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer)
      setIsSpeaking(true)
      startTypewriter(text)
    }
    utterance.onend = safeOnDone
    utterance.onerror = safeOnDone

    window.speechSynthesis.speak(utterance)

    // ⚠️ FALLBACK: If speech doesn't start within 4 seconds (Chrome bug),
    // show full text and start recognition anyway
    fallbackTimer = window.setTimeout(() => {
      safeOnDone()
    }, 4000)
  }, [])

  // ─── Typewriter Effect ───────────────────────────────────
  const startTypewriter = useCallback((text: string) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    setVisibleQuestionText('')
    setShowTypewriter(true)
    let i = 0
    typewriterRef.current = window.setInterval(() => {
      i++
      setVisibleQuestionText(text.slice(0, i))
      if (i >= text.length) {
        if (typewriterRef.current) clearInterval(typewriterRef.current)
        typewriterRef.current = null
      }
    }, TYPEWRITER_SPEED_MS)
  }, [])

  const stopTypewriter = useCallback(() => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current)
      typewriterRef.current = null
    }
  }, [])

  // ─── Always-On Speech Recognition ────────────────────────
  const startRecognition = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setError("Speech recognition isn't supported in this browser. Try Chrome.")
      return
    }

    // Stop any existing recognition first to avoid multiple instances
    if (recognitionRef.current) {
      const old = recognitionRef.current
      old.onend = null
      old.onerror = null
      old.onresult = null
      try { old.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal && i === 0) {
          // First final result — user started speaking
          if (answerStartTimeRef.current === null) {
            answerStartTimeRef.current = Date.now()
            setAnswerStartTime(answerStartTimeRef.current)
          }
        }
        transcript += result[0].transcript + ' '
      }
      setLiveTranscript(transcript.trim())
      lastSpeechTimeRef.current = Date.now()
      setLastSpeechTime(lastSpeechTimeRef.current)
      setIsSpeakingAnswer(true)
      autoSubmitPendingRef.current = false
    }

    recognition.onerror = () => {
      // Error already ends recognition — onend will handle restart
      // Don't call stop() here, that breaks the natural flow
    }

    recognition.onend = () => {
      setIsSpeakingAnswer(false)
      // Auto-restart recognition unless we're leaving interview stage
      const currentStage = stageRef.current
      if (currentStage === 'interview' || currentStage === 'followup') {
        try {
          recognition.start()
        } catch { /* might be in cleanup */ }
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch { /* ignore */ }
  }, []) // Stable — no re-creation on state changes

  const stopRecognition = useCallback(() => {
    try {
      const rec = recognitionRef.current
      if (rec) {
        // Remove onend so it doesn't auto-restart after we stop it
        rec.onend = null
        rec.stop()
        recognitionRef.current = null
      }
    } catch { /* ignore */ }
  }, [])

  // Keep refs in sync with state (for stable recognition handlers)
  useEffect(() => { answerStartTimeRef.current = answerStartTime }, [answerStartTime])
  useEffect(() => { lastSpeechTimeRef.current = lastSpeechTime }, [lastSpeechTime])
  useEffect(() => { stageRef.current = stage }, [stage])

  // Keep stable refs so kickoff effect doesn't re-run on every speech change
  useEffect(() => { startRecognitionRef.current = startRecognition }, [startRecognition])
  useEffect(() => { stopTypewriterCleanupRef.current = stopTypewriter }, [stopTypewriter])

  // ─── Kickoff speech recognition on interview start ───────
  useEffect(() => {
    if ((stage === 'interview' || stage === 'followup') && questions.length > 0) {
      const currentText = (currentFollowUp || questions[currentIndex])?.text
      if (currentText) {
        // Reset state for new question
        setLiveTranscript('')
        setShowTypewriter(true)
        setVisibleQuestionText('')
        setAnswerStartTime(null)
        setQuestionEndTime(null)
        setAutoSubmitting(false)
        autoSubmitPendingRef.current = false
        setIsSpeakingAnswer(false)
        setLastSpeechTime(Date.now())
        setSkipped(false)

        // Speak question immediately (no setTimeout — speech needs user gesture)
        speakQuestion(currentText, () => {
          // Start recognition when question finishes speaking
          startRecognitionRef.current?.()
        })
      }
    }
    return () => {
      stopTypewriterCleanupRef.current?.()
    }
    // Only re-run when question/stage changes, NOT when startRecognition changes
  }, [stage, currentIndex, currentFollowUp, questions, speakQuestion])

  // ─── Silence Detection (Auto-Submit) ─────────────────────
  useEffect(() => {
    if (!(stage === 'interview' || stage === 'followup')) return
    if (autoSubmitPendingRef.current) return

    const interval = setInterval(() => {
      if (
        questionEndTime &&
        answerStartTime &&
        !isSpeakingAnswer &&
        liveTranscript.trim().length > 0 &&
        Date.now() - lastSpeechTime > SILENCE_TIMEOUT_MS
      ) {
        autoSubmitPendingRef.current = true
        setAutoSubmitting(true)
        setTimeout(() => {
          if (autoSubmitPendingRef.current) {
            handleSubmitRef.current?.()
          }
        }, 800)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [stage, questionEndTime, answerStartTime, isSpeakingAnswer, liveTranscript, lastSpeechTime])

  // ─── Tab Switching Detection (Anti-Cheat) ────────────────
  useEffect(() => {
    if (stage !== 'interview' && stage !== 'followup') return

    const handleVisibility = () => {
      if (document.hidden) {
        handleTabSwitch()
      }
    }
    const handleBlur = () => {
      handleTabSwitch()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
    }
  }, [stage, tabViolations])

  const handleTabSwitch = useCallback(() => {
    // Only count if document is actually hidden (tab switch), not just blur
    if (typeof document !== 'undefined' && !document.hidden) return

    setTabViolations(prev => {
      const newCount = prev + 1
      if (newCount >= TAB_VIOLATION_LIMIT) {
        cancelInterviewRef.current?.()
        return newCount
      }
      const warningMsg =
        newCount === 1
          ? '⚠️ Tab switch detected! Do not switch tabs during the interview.'
          : '⚠️ Final warning! One more switch and your interview will be cancelled.'
      setCheatingWarning(warningMsg)
      setTimeout(() => setCheatingWarning(null), 4000)
      return newCount
    })
  }, [])

  // ─── Helper: save full interview to MongoDB ─────────────
  const saveInterviewToDB = useCallback(async (
    finalAnswers: AnswerRecord[],
    analysis: AnalysisResult | undefined,
    isCheated: boolean,
    cheatReason: string = ''
  ) => {
    if (!token) return
    const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
    try {
      await fetch('/api/interview/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          field,
          experience,
          skills,
          questions,
          totalQuestions: totalQuestions.current,
          answers: finalAnswers,
          result: analysis || null,
          cheated: isCheated,
          cheatReason,
          durationMinutes: 0, // Could calculate from start-end time
        }),
      })
    } catch { /* save to db failed - non-critical */ }
  }, [token, field, experience, skillsInput, questions])

  // ─── Cancel Interview (Cheating) ─────────────────────────
  const cancelInterviewAsCheating = useCallback(async () => {
    stopRecognition()
    stopTypewriter()
    window.speechSynthesis?.cancel()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null

    // Save to MongoDB (cheating record)
    const cheatingResult: AnalysisResult = {
      overallScore: 0,
      categories: { confidence: 0, knowledge: 0, communication: 0, voiceClarity: 0 },
      perQuestion: [],
      finalComments: 'Interview was cancelled due to suspected cheating. Multiple tab switches were detected.',
      hireDecision: 'No Hire',
      cheated: true,
      cheatReason: 'Multiple tab switches detected during the interview.',
    }
    await saveInterviewToDB(answers, cheatingResult, true, 'Multiple tab switches detected during the interview.')

    // Save stats (count as taken)
    if (token) {
      try {
        await fetch('/api/stats/interview-completed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ score: 0, cheated: true }),
        })
      } catch { /* ignore */ }
    }

    setResult(cheatingResult)
    setStage('report')
  }, [token, stopRecognition, stopTypewriter, answers, saveInterviewToDB])

  // Keep ref in sync
  useEffect(() => {
    cancelInterviewRef.current = cancelInterviewAsCheating
  }, [cancelInterviewAsCheating])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
      stopRecognition()
      stopTypewriter()
      window.speechSynthesis?.cancel()
    }
  }, [stopRecognition, stopTypewriter])

  // Video stream re-attach
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [stage])

  // Fetch usage count + plan
  const [isProPlan, setIsProPlan] = useState(false)
  const [monthlyInterviewCount, setMonthlyInterviewCount] = useState(0)

  useEffect(() => {
    if (!token) return
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/stats/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const count = data.stats.interviewCount || 0
          const plan = data.stats.plan || 'free'
          const monthlyCount = data.stats.monthlyInterviewCount || 0
          setIsProPlan(plan === 'pro')
          setUsageCount(count)
          setMonthlyInterviewCount(monthlyCount)
          if (plan !== 'pro' && monthlyCount >= FREE_PLAN_LIMIT) setStage('locked')
        }
      } catch { /* backend might be offline */ }
    }
    fetchUsage()
  }, [token])

  // ─── Setup Submit ────────────────────────────────────────
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!field.trim() || !skillsInput.trim()) {
      setError('Please fill in your field and skills before continuing.')
      return
    }
    setError(null)
    setIsGenerating(true)

    try {
      const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
      const introQuestion: InterviewQuestion = {
        id: 0,
        type: 'behavioral',
        text: "Tell me about yourself. Introduce your background, education, and what you're looking for.",
        topic: 'introduction',
      }
      const fetched = await fetchQuestions({ field, skills, experience }, totalQuestions.current)
      if (!fetched || fetched.length === 0) {
        throw new Error('No questions were generated. Try different skills or check GEMINI_API_KEY.')
      }
      const allQuestions = [introQuestion, ...fetched]
      setQuestions(allQuestions)
      setStage('permission')
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── Camera Permission ───────────────────────────────────
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      // Count this interview as started — even if user goes back, count stays
      if (token) {
        try {
          const res = await fetch('/api/stats/interview-started', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            setUsageCount(data.interviewCount || 0)
          }
        } catch { /* ignore */ }
      }

      setStage('interview')
      setCurrentIndex(0)
      setTabViolations(0)
      setCheatingWarning(null)
    } catch {
      setError('Camera or microphone access was denied.')
    }
  }

  // ─── Submit Answer ──────────────────────────────────────
  const handleSubmitAnswer = useCallback(async () => {
    if (autoSubmitPendingRef.current) autoSubmitPendingRef.current = false
    setAutoSubmitting(false)
    stopRecognition()

    if (!liveTranscript.trim() && !skipped) {
      setError('Please speak your answer or click Skip to skip this question.')
      startRecognition()
      return
    }
    setError(null)

    const currentQuestion = currentFollowUp || questions[currentIndex]
    const durationSeconds = answerStartTime
      ? Math.max(1, Math.round((Date.now() - answerStartTime) / 1000))
      : 0
    const latencyMs = questionEndTime && answerStartTime
      ? Math.max(0, answerStartTime - questionEndTime)
      : 0

    // Check relevance if not skipped
    const lowRelevance = !skipped && liveTranscript.trim().length > 0
      ? !checkRelevance(currentQuestion.text, liveTranscript)
      : false

    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      questionType: currentQuestion.type,
      questionTopic: currentQuestion.topic || '',
      transcript: skipped ? '(skipped)' : (liveTranscript.trim() || '(no answer captured)'),
      durationSeconds,
      fillerWordCount: skipped ? 0 : countFillerWords(liveTranscript),
      isFollowUp: !!currentFollowUp,
      answeredByVoice: !skipped && liveTranscript.trim().length > 0,
      originalQuestionId: currentFollowUp ? questions[currentIndex]?.id : undefined,
      // New fields
      responseLatencyMs: latencyMs,
      speakingDurationMs: durationSeconds * 1000,
      silentPauses: 0,
      skipped,
      lowRelevance,
    }

    const updatedAnswers = [...answers, record]
    setAnswers(updatedAnswers)

    // If skipped, go next without follow-up
    if (skipped) {
      setCurrentFollowUp(null)
      goToNextQuestion(updatedAnswers)
      return
    }

    const good = isAnswerGood(liveTranscript)

    if (!good && !currentFollowUp && currentQuestion.topic && currentQuestion.topic !== 'introduction') {
      const updatedWeaknesses = [...topicWeaknesses]
      const existing = updatedWeaknesses.find(w => w.topic === currentQuestion.topic)
      if (existing) {
        existing.askedCount++
      } else {
        updatedWeaknesses.push({ topic: currentQuestion.topic, askedCount: 1 })
      }
      setTopicWeaknesses(updatedWeaknesses)

      if (!existing || existing.askedCount < 2) {
        const followUp = await fetchFollowUp(field, currentQuestion.text, liveTranscript, currentQuestion.topic)
        setCurrentFollowUp(followUp)
        setLiveTranscript('')
        setAnswerStartTime(null)
        setQuestionEndTime(null)
        setSkipped(false)
        setStage('followup')
        return
      }
    }

    setCurrentFollowUp(null)
    goToNextQuestion(updatedAnswers)
  }, [
    liveTranscript, skipped, answerStartTime, currentFollowUp, questions,
    currentIndex, questionEndTime, answers, topicWeaknesses, field,
    stopRecognition, startRecognition,
  ])

  // Keep ref in sync
  useEffect(() => {
    handleSubmitRef.current = handleSubmitAnswer
  }, [handleSubmitAnswer])

  const goToNextQuestion = (finalAnswers: AnswerRecord[]) => {
    setLiveTranscript('')
    setAnswerStartTime(null)
    setQuestionEndTime(null)
    setSkipped(false)
    setAutoSubmitting(false)
    autoSubmitPendingRef.current = false

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
      setStage('interview')
    } else {
      void finishInterview(finalAnswers)
    }
  }

  // ─── Skip Question ──────────────────────────────────────
  const handleSkip = () => {
    setSkipped(true)
    stopRecognition()
    stopTypewriter()
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)

    // Record a skipped answer
    const currentQuestion = currentFollowUp || questions[currentIndex]
    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      questionType: currentQuestion.type,
      questionTopic: currentQuestion.topic || '',
      transcript: '(skipped)',
      durationSeconds: 0,
      fillerWordCount: 0,
      isFollowUp: !!currentFollowUp,
      answeredByVoice: false,
      originalQuestionId: currentFollowUp ? questions[currentIndex]?.id : undefined,
      responseLatencyMs: 0,
      speakingDurationMs: 0,
      silentPauses: 0,
      skipped: true,
      lowRelevance: true,
    }

    const updatedAnswers = [...answers, record]
    setAnswers(updatedAnswers)
    setCurrentFollowUp(null)

    goToNextQuestion(updatedAnswers)
  }

  // ─── Skip Follow-Up ──────────────────────────────────────
  const handleSkipFollowUp = () => {
    setCurrentFollowUp(null)
    setLiveTranscript('')
    setAnswerStartTime(null)
    setQuestionEndTime(null)
    setSkipped(false)

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
      setStage('interview')
    } else {
      void finishInterview(answers)
    }
  }

  // ─── Analysis ────────────────────────────────────────────
  const finishInterview = async (finalAnswers: AnswerRecord[]) => {
    setStage('analyzing')
    window.speechSynthesis?.cancel()
    stopRecognition()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null

    let analysis: AnalysisResult | undefined
    try {
      analysis = await fetchAnalysis(field, experience, finalAnswers)
      setResult(analysis)
    } catch (err: any) {
      setError(err.message || 'Analysis failed.')
    }

    // Save to MongoDB
    await saveInterviewToDB(finalAnswers, analysis, false)

    if (analysis?.overallScore) {
      try {
        await fetch('/api/stats/interview-completed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ score: analysis.overallScore }),
        })
      } catch { /* stats save failed */ }
    }
    setStage('report')
  }

  const startOver = () => {
    setStage(usageCount >= FREE_PLAN_LIMIT ? 'locked' : 'setup')
    setField('')
    setSkillsInput('')
    setExperience('fresher')
    setQuestions([])
    setCurrentIndex(0)
    setAnswers([])
    setResult(null)
    setError(null)
    setTopicWeaknesses([])
    setCurrentFollowUp(null)
    setTabViolations(0)
    setCheatingWarning(null)
    setShowTypewriter(true)
    setVisibleQuestionText('')
    setLiveTranscript('')
    setAnswerStartTime(null)
    setQuestionEndTime(null)
    setIsSpeakingAnswer(false)
    setSkipped(false)
    totalQuestions.current = Math.floor(Math.random() * (TOTAL_QUESTIONS_MAX - TOTAL_QUESTIONS_MIN + 1)) + TOTAL_QUESTIONS_MIN
  }

  // ========================= RENDER =========================

  if (stage === 'locked') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-amber-50">
              <Sparkles className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#101828]">Free plan limit reached</h2>
            <p className="mt-2 text-[13.5px] text-[#667085]">
              You've used all {FREE_PLAN_LIMIT} free interviews this month. Upgrade to keep practicing.
            </p>
            <Link to="/student/pro-plan" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
              Upgrade plan
            </Link>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  if (stage === 'setup') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 shadow-sm">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <Mic className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#101828]">AI Mock Interview</h1>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              Practice with an AI interviewer. {totalQuestions.current} questions per interview.
            </p>
            <p className="mt-1 text-[12px] text-[#667085]">
              {isProPlan ? (
                <span className="text-emerald-600 font-medium">⭐ Pro: Unlimited interviews</span>
              ) : (
                <>Free plan: {Math.max(0, FREE_PLAN_LIMIT - monthlyInterviewCount)} of {FREE_PLAN_LIMIT} interviews this month</>
              )}
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
            )}

            <div className="mt-4 rounded-xl border border-[#1a6fa8]/10 bg-blue-50/50 px-4 py-3">
              <p className="text-[13px] text-[#667085]">
                Fields autofill from your{' '}
                <a href="/student/profile" className="font-medium text-[#1a6fa8] underline hover:text-[#0b3b5c]">profile</a>.
              </p>
            </div>

            <form onSubmit={handleSetupSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#101828]">Field / role <span className="text-red-500">*</span></label>
                <input value={field} onChange={e => setField(e.target.value)} placeholder="e.g. Frontend Developer"
                  className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#101828]">Key skills (comma separated) <span className="text-red-500">*</span></label>
                <input value={skillsInput} onChange={e => setSkillsInput(e.target.value)} placeholder="e.g. React, TypeScript, REST APIs"
                  className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#101828]">Experience level <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-3">
                  {(['fresher', 'junior', 'mid', 'senior'] as ExperienceLevel[]).map(level => (
                    <button key={level} type="button" onClick={() => setExperience(level)}
                      className={`rounded-xl border-2 px-3 py-3 text-center text-sm font-medium transition-all capitalize ${
                        experience === level
                          ? 'border-[#1a6fa8] bg-blue-50 text-[#1a6fa8] shadow-sm'
                          : 'border-[#EAECF0] bg-white text-[#667085] hover:border-[#D0D5DD] hover:text-[#101828]'
                      }`}>
                      {level === 'fresher' ? 'Fresher' : level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 disabled:opacity-70">
                {isGenerating ? (
                  <>Generating AI questions... <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /></>
                ) : (
                  <>Continue <ChevronRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  if (stage === 'permission') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50">
              <Camera className="h-8 w-8 text-[#1a6fa8]" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#101828]">Enable your camera and microphone</h2>
            <p className="mt-2 text-[13.5px] text-[#667085]">The AI interviewer needs to see and hear you.</p>
            <p className="mt-1 text-[12px] text-amber-600">⚠️ Do not switch tabs during the interview — this will be flagged as cheating.</p>
            <video ref={videoRef} autoPlay muted playsInline
              className="mx-auto mt-4 aspect-video w-full max-w-md rounded-xl bg-[#0b3b5c] object-cover" />
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
            )}
            <button onClick={requestPermissions}
              className="mt-5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
              Allow camera & mic
            </button>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  // ===== INTERVIEW + FOLLOWUP =====
  if (stage === 'interview' || stage === 'followup') {
    if (questions.length === 0) {
      return (
        <StudentDashboardLayout>
          <div className="p-8">
            <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
              <p className="text-[14px] text-red-500">No questions available. Please start over.</p>
              <button onClick={startOver} className="mt-4 text-[#1a6fa8] underline">Go back</button>
            </div>
          </div>
        </StudentDashboardLayout>
      )
    }
    const currentQuestion = currentFollowUp || questions[currentIndex]
    const totalItems = questions.length + topicWeaknesses.filter(w => w.askedCount > 0).length
    const answeredCount = answers.length
    const isFollowUp = stage === 'followup'
    const questionFullyShown = !showTypewriter

    // Determine if silence countdown should show
    const showSilenceIndicator =
      questionEndTime &&
      answerStartTime &&
      !isSpeakingAnswer &&
      liveTranscript.trim().length > 0 &&
      Date.now() - lastSpeechTime > 2000

    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="w-full space-y-6">
            {/* Anti-cheat warning popup */}
            {cheatingWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 fade-in">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                    <Eye className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-red-700">Tab Switch Detected!</p>
                  <p className="mt-1 text-[13px] text-red-600">{cheatingWarning}</p>
                </div>
              </div>
            )}

            {/* Auto-submit indicator */}
            {autoSubmitting && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-700 animate-pulse">
                Submitting answer (you stopped speaking)...{' '}
                <button onClick={() => { autoSubmitPendingRef.current = false; setAutoSubmitting(false); startRecognition() }}
                  className="ml-2 font-medium underline">Cancel</button>
              </div>
            )}

            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-[13px] text-[#667085]">
                <span>Question {answeredCount + 1} of ~{Math.min(totalItems + 2, 14)}</span>
                <div className="flex items-center gap-3">
                  {currentQuestion.topic && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-medium text-[#1a6fa8] capitalize">
                      {currentQuestion.topic}
                    </span>
                  )}
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-medium text-[#1a6fa8] capitalize">
                    {currentQuestion.type}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#EAECF0]">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] transition-all duration-500"
                  style={{ width: `${Math.min((answeredCount / Math.min(totalItems + 2, 14)) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Follow-up indicator */}
            {isFollowUp && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Let me ask more about this topic to better understand your knowledge.
              </div>
            )}

            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              {/* Speaking indicator */}
              {isSpeaking && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c]/5 to-[#1a6fa8]/5 px-4 py-2.5 text-[13px] text-[#1a6fa8] animate-pulse">
                  <Volume2 className="h-4 w-4" />
                  <span className="font-medium">AI interviewer is speaking the question...</span>
                  <span className="ml-auto flex gap-0.5">
                    <span className="h-2 w-1 animate-bounce rounded-full bg-[#1a6fa8]" style={{ animationDelay: '0ms' }} />
                    <span className="h-3 w-1 animate-bounce rounded-full bg-[#1a6fa8]" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-1 animate-bounce rounded-full bg-[#1a6fa8]" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              )}

              {/* Camera */}
              <video ref={videoRef} autoPlay muted playsInline
                className="aspect-video w-full rounded-xl bg-[#0b3b5c] object-cover" />

              {/* Mic always-on indicator */}
              <div className="mt-3 flex items-center gap-1.5 text-[12px] text-emerald-600">
                <Mic className={`h-3.5 w-3.5 ${isSpeakingAnswer ? 'animate-pulse' : ''}`} />
                <span>Mic always on {isSpeakingAnswer ? '🎤 (speaking...)' : ''}</span>
                {questionFullyShown && !answerStartTime && (
                  <span className="ml-auto text-[#98A2B3]">Waiting for your response...</span>
                )}
              </div>

              {/* Question Text — Typewriter Effect */}
              <div className="mt-4">
                <p className="text-lg font-semibold leading-relaxed text-[#101828]">
                  {showTypewriter ? (
                    <>
                      {visibleQuestionText}
                      <span className="animate-pulse text-[#1a6fa8]">|</span>
                    </>
                  ) : (
                    currentQuestion.text
                  )}
                </p>
              </div>

              {/* Live Transcript */}
              <div className="mt-4 min-h-[80px] rounded-xl border border-[#EAECF0] bg-[#F7F9FC] p-4 text-[14px] text-[#667085]">
                {liveTranscript || (
                  questionFullyShown
                    ? '🎤 Speak your answer — the mic is listening...'
                    : '🔊 Listening to the AI interviewer...'
                )}
                {liveTranscript && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[12px] font-medium ${isAnswerGood(liveTranscript) ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {liveTranscript.split(/\s+/).filter(Boolean).length} words
                      {isAnswerGood(liveTranscript) ? ' ✓' : ' (aim for 20+)'}
                    </span>
                    {/* Silence countdown */}
                    {showSilenceIndicator && (
                      <span className="text-[12px] text-[#98A2B3]">
                        Auto-submitting in {Math.max(0, Math.ceil((SILENCE_TIMEOUT_MS - (Date.now() - lastSpeechTime)) / 1000))}s...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex gap-3">
                {/* Submit button (always visible when there's transcript) */}
                {questionFullyShown && liveTranscript.trim() && (
                  <button onClick={handleSubmitAnswer}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
                    <Send className="h-4 w-4" /> Submit answer
                  </button>
                )}

                {/* Skip button (always visible once question is shown) */}
                {questionFullyShown && (
                  <button onClick={handleSkip}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-600 transition-all hover:bg-amber-100 hover:border-amber-300">
                    <SkipForward className="h-4 w-4" /> Skip
                  </button>
                )}
              </div>

              {/* Skip follow-up */}
              {isFollowUp && (
                <button onClick={handleSkipFollowUp}
                  className="mt-3 w-full rounded-xl border border-[#EAECF0] bg-white py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]">
                  Skip follow-up, go to next question
                </button>
              )}


            </div>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  if (stage === 'analyzing') {
    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#EAECF0] border-t-[#1a6fa8]" />
            <p className="mt-4 text-[14px] text-[#667085]">Analyzing your answers with strict HR evaluation...</p>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  if (stage === 'report' && result) {
    const isCheated = result.cheated
    const hireColors: Record<string, string> = {
      'Strong Hire': 'bg-emerald-50 text-emerald-600 border-emerald-200',
      'Hire': 'bg-blue-50 text-[#1a6fa8] border-blue-200',
      'Lean Hire': 'bg-amber-50 text-amber-600 border-amber-200',
      'No Hire': 'bg-red-50 text-red-600 border-red-200',
    }
    const hireIcons: Record<string, any> = {
      'Strong Hire': ThumbsUp,
      'Hire': ThumbsUp,
      'Lean Hire': AlertTriangle,
      'No Hire': ThumbsDown,
    }
    const HireIcon = isCheated ? ShieldAlert : (hireIcons[result.hireDecision] || ThumbsUp)
    const bannerColor = isCheated
      ? 'bg-red-50 text-red-600 border-red-200'
      : (hireColors[result.hireDecision] || 'bg-[#F7F9FC] text-[#667085]')

    return (
      <StudentDashboardLayout>
        <div className="p-8">
          <div className="w-full space-y-6">
            {/* Cheating banner */}
            {isCheated && (
              <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                  <Gavel className="h-7 w-7 text-red-500" />
                </div>
                <h2 className="mt-3 text-xl font-bold text-red-600">⚠️ Cheating Detected</h2>
                <p className="mt-1 text-[13px] text-red-500">{result.cheatReason || 'Multiple tab switches detected.'}</p>
                <p className="mt-2 text-[12px] text-[#667085]">
                  This interview counts toward your usage limit. Score: 0.
                </p>
              </div>
            )}

            {/* Hire decision banner */}
            {!isCheated && (
              <div className={`rounded-2xl border p-6 text-center shadow-sm ${bannerColor}`}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                  <HireIcon className="h-7 w-7" />
                </div>
                <h2 className="mt-3 text-xl font-bold">{result.hireDecision || 'Evaluation Complete'}</h2>
                <p className="mt-1 text-[13px] opacity-80">Based on your interview performance</p>
              </div>
            )}

            {/* Overall Score */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
              <p className="text-[13.5px] text-[#667085]">Overall Score</p>
              <div className={`mx-auto mt-2 flex h-28 w-28 items-center justify-center rounded-full shadow-lg ${
                isCheated
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30'
                  : 'bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-[#0b3b5c]/30'
              }`}>
                <div className="text-center">
                  <span className="text-3xl font-bold text-white">{isCheated ? '0' : result.overallScore.toFixed(1)}</span>
                  <span className="text-sm text-white/70">/10</span>
                </div>
              </div>
            </div>

            {/* Categories (only show if not cheated) */}
            {!isCheated && (
              <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm space-y-4">
                {([{ label: 'Knowledge', score: result.categories.knowledge },
                   { label: 'Confidence', score: result.categories.confidence },
                   { label: 'Communication', score: result.categories.communication },
                   { label: 'Voice Clarity', score: result.categories.voiceClarity },
                ]).map(cat => (
                  <div key={cat.label}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="text-[#667085]">{cat.label}</span>
                      <span className="font-medium text-[#101828]">{cat.score.toFixed(1)}/10</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#EAECF0]">
                      <div className="h-2 rounded-full bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] transition-all"
                        style={{ width: `${(cat.score / 10) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-question feedback */}
            {!isCheated && result.perQuestion.length > 0 && (
              <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-[15px] font-semibold text-[#101828]">Question feedback</h3>
                <div className="space-y-4">
                  {result.perQuestion.map((q, i) => (
                    <div key={i} className="rounded-xl border border-[#EAECF0] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13px] font-medium text-[#101828]">Q{i + 1}: {q.questionText}</p>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                          q.score >= 6 ? 'bg-emerald-50 text-emerald-600' : q.score === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>{q.score}/10</span>
                      </div>
                      {q.errors.length > 0 && (
                        <ul className="mt-2 space-y-1 pl-4 text-[12.5px] text-red-500" style={{ listStyle: 'disc' }}>
                          {q.errors.map((err, j) => <li key={j}>{err}</li>)}
                        </ul>
                      )}
                      {q.solutions.length > 0 && (
                        <ul className="mt-2 space-y-1 pl-4 text-[12.5px] text-emerald-600" style={{ listStyle: 'disc' }}>
                          {q.solutions.map((sol, j) => <li key={j}>{sol}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final comments */}
            <div className="rounded-2xl border border-[#EAECF0] bg-[#F7F9FC] p-6 shadow-sm">
              <h3 className="text-[15px] font-semibold text-[#101828]">
                {isCheated ? 'Result' : 'Final comments'}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#667085]">
                {isCheated
                  ? 'This interview was marked as invalid due to suspected cheating. Tab switching is not allowed during interviews.'
                  : result.finalComments}
              </p>
            </div>

            <div className="flex gap-3">
              {isCheated && (
                <Link to="/student/dashboard"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#EAECF0] bg-white px-5 py-3.5 text-sm font-semibold text-[#667085] transition-all hover:bg-[#F7F9FC] hover:border-[#D0D5DD]">
                  Go to Dashboard
                </Link>
              )}
              <button onClick={startOver}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
                <RotateCcw className="h-4 w-4" /> Start new interview
              </button>
            </div>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  return null
}
