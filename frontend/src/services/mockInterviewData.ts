/**
 * MOCK INTERVIEW DATA SERVICE
 * Connects to backend API which uses Gemini for AI-powered questions & analysis.
 */

export type ExperienceLevel = "fresher" | "junior" | "mid" | "senior"
export type QuestionType = "technical" | "behavioral" | "situational"

export interface SetupData {
  field: string
  skills: string[]
  experience: ExperienceLevel
}

export interface InterviewQuestion {
  id: number
  type: QuestionType
  text: string
  topic: string
  difficulty?: 'easy' | 'normal' | 'hard'
}

export interface AnswerRecord {
  questionId: number
  questionText: string
  questionType: QuestionType
  questionTopic: string
  transcript: string
  durationSeconds: number
  fillerWordCount: number
  isFollowUp: boolean
  answeredByVoice: boolean
  originalQuestionId?: number
  // ─── New fields for enhanced analysis ───
  responseLatencyMs: number     // time from question end to first word spoken
  speakingDurationMs: number    // actual speaking time (excluding silence)
  silentPauses: number          // number of pauses >2s during answer
  skipped: boolean              // user skipped this question
  lowRelevance: boolean         // answer was off-topic / irrelevant
}

export interface PerQuestionFeedback {
  questionText: string
  score: number
  errors: string[]
  solutions: string[]
}

export interface AnalysisResult {
  overallScore: number
  categories: {
    confidence: number
    knowledge: number
    communication: number
    voiceClarity: number
  }
  perQuestion: PerQuestionFeedback[]
  finalComments: string
  hireDecision: "Strong Hire" | "Hire" | "Lean Hire" | "No Hire"
  // ─── New ───
  cheated?: boolean
  cheatReason?: string
}

/** Fetch 7-10 AI-generated questions from backend (Gemini) */
export async function fetchQuestions(setupData: SetupData, totalQuestions: number): Promise<InterviewQuestion[]> {
  try {
    const res = await fetch("/api/interview/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...setupData, totalQuestions }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "questions endpoint failed")
    }
    const data: { questions: InterviewQuestion[] } = await res.json()
    return data.questions || []
  } catch (err) {
    console.error("fetchQuestions error:", err)
    throw err // Propagate so the UI can show the Gemini API key error
  }
}

/** Generate a follow-up question when candidate answers poorly */
export async function fetchFollowUp(
  field: string,
  originalQuestion: string,
  candidateAnswer: string,
  topic: string
): Promise<InterviewQuestion> {
  try {
    const res = await fetch("/api/interview/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, originalQuestion, candidateAnswer, topic }),
    })
    if (!res.ok) throw new Error("followup endpoint failed")
    const data: { followup: InterviewQuestion } = await res.json()
    return data.followup
  } catch {
    // Fallback: generate a simple follow-up locally
    return {
      id: Date.now(),
      type: "technical" as QuestionType,
      text: `Can you explain more about ${topic}? Give a specific example.`,
      topic,
    }
  }
}

/** Analyze all answers with strict HR evaluation */
export async function fetchAnalysis(
  field: string,
  experience: ExperienceLevel,
  answers: AnswerRecord[]
): Promise<AnalysisResult> {
  try {
    const res = await fetch("/api/interview/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, experience, answers }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "analyze endpoint failed")
    }
    return await res.json()
  } catch (err) {
    console.error("fetchAnalysis error:", err)
    throw err
  }
}
