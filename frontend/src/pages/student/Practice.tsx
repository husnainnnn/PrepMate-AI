import { useState, useEffect } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { useAuth } from '@/context/AuthContext'
import {
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Star,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Clock,
  BookOpen,
  BrainCircuit,
} from 'lucide-react'
import { fetchQuestions, evaluateSingleAnswer, type InterviewQuestion } from '@/services/mockInterviewData'

type Difficulty = 'beginner' | 'intermediate' | 'pro'
type Phase = 'setup' | 'quiz' | 'result'

interface Answer {
  questionId: number
  questionText: string
  userAnswer: string
  score: number
  feedback: string
}

const difficultyLabels: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  pro: 'Pro',
}

const difficultyColors: Record<Difficulty, string> = {
  beginner: 'from-emerald-500 to-emerald-600',
  intermediate: 'from-amber-500 to-amber-600',
  pro: 'from-rose-500 to-rose-600',
}

const difficultyDotColors: Record<Difficulty, string> = {
  beginner: 'bg-emerald-500',
  intermediate: 'bg-amber-500',
  pro: 'bg-rose-500',
}

export default function PracticePage() {
  const { token } = useAuth()
  const [phase, setPhase] = useState<Phase>('setup')
  const [field, setField] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillsInput, setSkillsInput] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [userExperience, setUserExperience] = useState<string>('mid')

  const totalQuestions = 5

  // ─── Load profile for autofill ──────────────────────────
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const user = await res.json()
          if (user.field) setField(user.field)
          if (user.skills?.length > 0) {
            setSkills(user.skills)
            setSkillsInput(user.skills.join(', '))
          }
          if (user.experience) setUserExperience(user.experience)
          setProfileLoaded(true)
        }
      } catch { /* backend offline */ }
      setLoading(false)
    }
    loadProfile()
  }, [token])

  // ─── Fetch AI questions ─────────────────────────────────
  const startQuiz = async () => {
    if (!field.trim()) {
      setError('Field is required to generate questions.')
      return
    }
    if (!skillsInput.trim()) {
      setError('At least one skill is required.')
      return
    }

    setError(null)
    setGenerating(true)

    // Track session start immediately (even if user leaves midway)
    if (token) {
      fetch('/api/stats/practice-started', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }

    try {
      const skillList = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
      const fetched = await fetchQuestions(
        { field: field.trim(), skills: skillList, experience: userExperience as any },
        totalQuestions
      )
      if (fetched && fetched.length > 0) {
        setQuestions(fetched)
      } else {
        throw new Error('No questions generated')
      }
      setCurrentIndex(0)
      setAnswers([])
      setUserAnswer('')
      setPhase('quiz')
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions. Make sure GEMINI_API_KEY is set on the backend.')
    }
    setGenerating(false)
  }

  // ─── Submit answer (AI-powered strict evaluation) ───────
  const submitAnswer = async () => {
    if (!userAnswer.trim() || evaluating) return
    setEvaluating(true)
    const q = questions[currentIndex]
    try {
      const result = await evaluateSingleAnswer(field, q.text, userAnswer, q.topic, q.type)
      setAnswers(prev => [...prev, {
        questionId: q.id,
        questionText: q.text,
        userAnswer,
        score: result.score,
        feedback: result.feedback,
      }])
    } catch {
      // Strict fallback — no free marks when AI is unavailable
      const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length
      let fallbackScore = 0
      let fallbackFeedback = 'AI evaluation unavailable. ';
      if (wordCount < 5) {
        fallbackFeedback += 'Answer too short — review the topic and try again.';
      } else {
        // Even long answers get at most 2 marks without AI validation
        fallbackScore = Math.min(2, Math.round(wordCount / 50))
        fallbackFeedback += 'Basic score given — AI was unavailable for proper evaluation.';
      }
      setAnswers(prev => [...prev, {
        questionId: q.id,
        questionText: q.text,
        userAnswer,
        score: fallbackScore,
        feedback: fallbackFeedback,
      }])
    }
    setEvaluating(false)
  }

  // ─── Next question / Finish ─────────────────────────────
  const goNext = () => {
    if (currentIndex >= totalQuestions - 1) {
      // Save practice stats
      if (token) {
        fetch('/api/stats/practice-completed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ questionCount: answers.length, field, difficulty }),
        }).catch(() => {})
      }
      setPhase('result')
      return
    }
    setCurrentIndex(prev => prev + 1)
    setUserAnswer('')
  }

  const restart = () => {
    setPhase('setup')
    setQuestions([])
    setCurrentIndex(0)
    setUserAnswer('')
    setAnswers([])
    setError(null)
  }

  const avgScore = answers.length > 0
    ? Math.round(answers.reduce((sum, a) => sum + a.score, 0) / answers.length)
    : 0

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <StudentDashboardLayout>
        <div className="flex items-center justify-center p-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#EAECF0] border-t-[#1a6fa8]" />
        </div>
      </StudentDashboardLayout>
    )
  }

  // ═══════════════ SETUP PHASE ═══════════════
  if (phase === 'setup') {
    return (
      <StudentDashboardLayout>
        <div className="space-y-6 px-6 py-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
                <BrainCircuit className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[#101828]">Practice Questions</h1>
                <p className="text-[13px] text-[#667085]">
                  AI-generated questions to test and improve your knowledge.
                </p>
              </div>
            </div>

            {/* Profile autofill notice */}
            {profileLoaded && (
              <div className="rounded-xl border border-[#1a6fa8]/10 bg-blue-50/50 px-4 py-3">
                <p className="text-[13px] text-[#667085]">
                  ✨ Field and skills autofilled from your{' '}
                  <a href="/student/profile" className="font-medium text-[#1a6fa8] underline hover:text-[#0b3b5c]">profile</a>.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Setup form */}
              <div className="lg:col-span-2 rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-[#101828]">Setup</h2>
                <p className="mb-4 text-[13px] text-[#667085]">
                  Configure your practice session. Fields marked with <span className="text-red-500">*</span> are required.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#101828]">
                      Field / Technology <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={field}
                      onChange={e => setField(e.target.value)}
                      placeholder="e.g. React, JavaScript, Python, Node.js..."
                      className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#101828]">
                      Skills (comma separated) <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={skillsInput}
                      onChange={e => setSkillsInput(e.target.value)}
                      placeholder="e.g. hooks, state, context, props..."
                      className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15"
                    />
                    {skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {skills.map(s => (
                          <span key={s} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-medium text-[#1a6fa8]">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-[#101828]">Difficulty <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['beginner', 'intermediate', 'pro'] as Difficulty[]).map(level => (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`rounded-xl border-2 px-4 py-3.5 text-center text-sm font-medium transition-all ${
                            difficulty === level
                              ? 'border-[#1a6fa8] bg-blue-50 text-[#1a6fa8] shadow-sm'
                              : 'border-[#EAECF0] bg-white text-[#667085] hover:border-[#D0D5DD] hover:text-[#101828]'
                          }`}
                        >
                          <span className={`mx-auto mb-1.5 block h-2 w-2 rounded-full ${difficultyDotColors[level]}`} />
                          {difficultyLabels[level]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={startQuiz}
                  disabled={generating || !field.trim() || !skillsInput.trim()}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-[#0b3b5c]/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating AI questions...</>
                  ) : (
                    <><BrainCircuit className="h-4 w-4" /> Start Practice <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>

              {/* Info card */}
              <div className="rounded-2xl border border-[#EAECF0] bg-gradient-to-br from-[#F7F9FC] to-white p-5 shadow-sm h-fit">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#1a6fa8]" />
                  <div>
                    <p className="text-sm font-medium text-[#101828]">AI-Powered Practice</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[#667085]">
                      Questions are generated by Gemini AI based on your field and skills.
                      Each answer is evaluated for accuracy and depth.
                      {totalQuestions} questions per session.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  // ═══════════════ QUIZ PHASE ═══════════════
  if (phase === 'quiz') {
    if (questions.length === 0) {
      return (
        <StudentDashboardLayout>
          <div className="p-8 text-center">
            <p className="text-[14px] text-red-500">No questions available. Please start over.</p>
            <button onClick={restart} className="mt-4 text-[#1a6fa8] underline">Go back</button>
          </div>
        </StudentDashboardLayout>
      )
    }

    const currentQuestion = questions[currentIndex]
    const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id)
    const isLast = currentIndex >= totalQuestions - 1
    const progress = ((currentIndex + (currentAnswer ? 1 : 0)) / totalQuestions) * 100

    return (
      <StudentDashboardLayout>
        <div className="space-y-6 px-6 py-6 lg:px-8">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-[13px] text-[#667085]">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium text-white bg-gradient-to-r ${difficultyColors[difficulty]}`}>
                    <Clock className="h-3 w-3" />
                    {difficultyLabels[difficulty]}
                  </span>
                  {currentQuestion.topic && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-medium capitalize text-[#1a6fa8]">
                      {currentQuestion.topic}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#EAECF0]">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* Question card */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm sm:p-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0b3b5c]/10 to-[#1a6fa8]/10 px-3 py-1 text-[12px] font-medium text-[#1a6fa8]">
                <Lightbulb className="h-3.5 w-3.5" />
                {field || 'Practice'}
              </div>

              <h2 className="mt-4 text-lg font-semibold leading-relaxed text-[#101828]">
                {currentQuestion.text}
              </h2>

              {currentQuestion.type && (
                <span className="mt-2 inline-block rounded-full bg-[#F7F9FC] px-2.5 py-0.5 text-[12px] font-medium capitalize text-[#667085]">
                  {currentQuestion.type}
                </span>
              )}

              {!currentAnswer ? (
                /* Answer input */
                <div className="mt-6">
                  <label className="mb-1.5 block text-sm font-medium text-[#101828]">
                    Your Answer
                  </label>
                  <textarea
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here. Be thorough and explain your reasoning..."
                    rows={6}
                    className="w-full rounded-xl border border-[#E4E7EC] bg-white p-4 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15 resize-none"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[12px] text-[#98A2B3]">
                      {userAnswer.trim() ? `${userAnswer.trim().split(/\s+/).filter(Boolean).length} words` : 'Write a detailed answer for best results'}
                    </span>
                  </div>
                  <button
                    onClick={submitAnswer}
                    disabled={!userAnswer.trim() || evaluating}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {evaluating ? (
                      <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> AI Evaluating...</>
                    ) : (
                      <>Submit Answer <CheckCircle2 className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              ) : (
                /* Answer feedback */
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-[#EAECF0] bg-[#F7F9FC] p-4">
                    <p className="text-[12px] font-medium uppercase tracking-wide text-[#98A2B3]">Your answer</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[#101828]">
                      {currentAnswer.userAnswer}
                    </p>
                  </div>

                  <div className={`rounded-xl border p-4 ${
                    currentAnswer.score >= 6 ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/50'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {currentAnswer.score >= 6
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        : <XCircle className="h-5 w-5 text-amber-500" />
                      }
                      <div>
                        <span className="text-sm font-semibold text-[#101828]">
                          Score: {currentAnswer.score}/10
                        </span>
                        <div className="mt-1 h-1.5 w-32 rounded-full bg-[#EAECF0]">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              currentAnswer.score >= 6 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${currentAnswer.score * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed text-[#667085]">
                      {currentAnswer.feedback}
                    </p>
                  </div>

                  <button
                    onClick={goNext}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110"
                  >
                    {isLast ? (
                      <><Sparkles className="h-4 w-4" /> See Results</>
                    ) : (
                      <><ArrowRight className="h-4 w-4" /> Next Question</>
                    )}
                  </button>
                </div>
              )}
            </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  // ═══════════════ RESULT PHASE ═══════════════
  const stars = Math.round(avgScore / 2)
  const performanceLabel = avgScore >= 8 ? 'Outstanding! 🎉' : avgScore >= 6 ? 'Great Effort! 👏' : avgScore >= 4 ? 'Keep Practicing! 💪' : "Let's Try Again! 📚"

  return (      <StudentDashboardLayout>
        <div className="space-y-6 px-6 py-6 lg:px-8">
          <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm sm:p-8">
            {/* Score circle */}
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <div className="text-center">
                <span className="text-3xl font-bold text-white">{avgScore}</span>
                <span className="text-sm text-white/70">/10</span>
              </div>
            </div>

            {/* Stars */}
            <div className="mt-4 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${i <= stars ? 'text-amber-400 fill-amber-400' : 'text-[#EAECF0]'}`}
                />
              ))}
            </div>

            <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight text-[#101828]">
              {performanceLabel}
            </h1>
            <p className="mt-1 text-center text-[13.5px] text-[#667085]">
              You completed {answers.length} of {totalQuestions} questions at{' '}
              <span className="font-medium text-[#101828]">{difficultyLabels[difficulty]}</span> level.
            </p>

            {/* Answer breakdown */}
            <div className="mt-6 space-y-3">
              {answers.map((ans, i) => (
                <div
                  key={ans.questionId}
                  className={`rounded-xl border p-4 transition-all hover:shadow-sm ${
                    ans.score >= 6 ? 'border-emerald-100 bg-emerald-50/30' : 'border-amber-100 bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-medium text-[#101828]">
                      <span className="text-[#98A2B3]">Q{i + 1}.</span> {ans.questionText}
                    </p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      ans.score >= 6 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {ans.score}/10
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] italic leading-relaxed text-[#667085]">
                    "{ans.userAnswer.length > 120 ? ans.userAnswer.slice(0, 120) + '...' : ans.userAnswer}"
                  </p>
                  <p className="mt-1 text-[12px] text-[#667085]">
                    {ans.feedback}
                  </p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 rounded-xl border border-[#EAECF0] bg-gradient-to-br from-[#F7F9FC] to-white p-5">
              <h3 className="text-sm font-semibold text-[#101828]">Performance Summary</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#667085]">
                {avgScore >= 8
                  ? `Excellent performance in ${field || 'the topic'} at ${difficultyLabels[difficulty]} level! Your answers demonstrate strong understanding. Ready to advance to the next difficulty.`
                  : avgScore >= 6
                  ? `Good understanding of ${field || 'the topic'} at ${difficultyLabels[difficulty]} level. Review the areas highlighted in your feedback to strengthen weak spots.`
                  : avgScore >= 4
                  ? `You're building familiarity with ${field || 'the topic'}. Focus on the key concepts mentioned in the feedback and try practicing with a lower difficulty level.`
                  : `Take time to study the fundamentals of ${field || 'the topic'}. We recommend starting with beginner level and working your way up.`}
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={restart}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#EAECF0] bg-white px-5 py-3 text-sm font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] hover:text-[#101828]"
              >
                <RotateCcw className="h-4 w-4" /> Try Again
              </button>
              <button
                onClick={() => window.location.href = '/student/dashboard'}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110"
              >
                <ChevronLeft className="h-4 w-4" /> Dashboard
              </button>
            </div>
          </div>
        </div>
    </StudentDashboardLayout>
  )
}
