const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Interview = require('../models/Interview');

const JWT_SECRET = process.env.JWT_SECRET || 'prepmate-ai-jwt-secret-2026';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // fast, generous free tier
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Gemini helper ────────────────────────────────────────

async function askGemini(systemPrompt, userPrompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured. Get a free key at https://aistudio.google.com/');
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Detect quota exceeded — trigger fallback
    if (res.status === 429 || res.status === 403) {
      const err = new Error(`Gemini API error (${res.status}): ${errText}`);
      err.statusCode = res.status;
      err.isQuotaError = true;
      throw err;
    }
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Groq helper (OpenAI-compatible, generous free tier) ───

async function askGroq(systemPrompt, userPrompt) {
  if (!GROQ_API_KEY) {
    const err = new Error('GROQ_API_KEY not configured');
    err.isQuotaError = true; // fall through to local templates
    throw err;
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) {
      const err = new Error(`Groq API rate limit (${res.status})`);
      err.isQuotaError = true;
      throw err;
    }
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ─── Local fallback generators ────────────────────────────

const QUESTION_TEMPLATES = {
  technical: [
    (f, s) => `Explain how you would implement ${s[0] || 'a core feature'} in a ${f} role. What patterns or best practices would you follow?`,
    (f, s) => `Describe a challenging bug you encountered while working with ${s[1] || s[0] || 'a technology'} and how you debugged it.`,
    (f, s) => `How would you optimize performance in a ${f} application? Give specific ${s.slice(0, 2).join('/') || 'technical'} examples.`,
    (f, s) => `What is your approach to testing in ${s[0] || 'your stack'}? How do you ensure code quality?`,
    (f, s) => `Compare and contrast ${s[0] || 'a common tool'} with its alternatives. When would you choose one over the other?`,
    (f, s) => `Walk me through how you would architect a scalable ${f} solution from scratch.`,
    (f, s) => `What security considerations are most important when building a ${f} application, especially with ${s.slice(0, 2).join(' and ') || 'your stack'}?`,
    (f, s) => `How do you handle state management and data flow in a complex ${f} project? Give a concrete example.`,
    (f, s) => `Describe a time you had to refactor existing ${s[0] || 'code'}. What was your process and what was the outcome?`,
    (f, s) => `What CI/CD practices do you follow for ${f} projects? How do you ensure smooth deployments?`,
  ],
  behavioral: [
    (f) => `Tell me about a time you had a disagreement with a teammate on a ${f} project. How did you resolve it?`,
    (f) => `Describe a situation where you had to learn a new technology quickly to meet a deadline in a ${f} role.`,
    (f) => `Tell me about a project you're proud of in the ${f} space. What was your specific contribution?`,
    (f) => `How do you stay updated with the latest trends and technologies in ${f}? Give an example.`,
    (f) => `Describe a time you received constructive criticism on your code or approach. How did you handle it?`,
  ],
  situational: [
    (f) => `You're assigned a ${f} feature with a tight deadline. Halfway through, requirements change significantly. What do you do?`,
    (f) => `A junior developer on your team is struggling with a ${f} task. How do you help them while still meeting your own deliverables?`,
    (f) => `Your production ${f} application goes down at 2 AM. Walk me through your incident response.`,
    (f) => `You discover a major security vulnerability in the ${f} codebase right before a release. What's your plan?`,
    (f) => `Your technical lead suggests an architecture you disagree with for a ${f} feature. How do you handle it?`,
  ],
};

function generateLocalQuestions(field, skills, experience, totalQuestions) {
  const questions = [];
  const techTemplates = [...QUESTION_TEMPLATES.technical];
  const behavTemplates = [...QUESTION_TEMPLATES.behavioral];
  const situTemplates = [...QUESTION_TEMPLATES.situational];

  // Shuffle each pool
  for (const arr of [techTemplates, behavTemplates, situTemplates]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // Ratio: 50% technical, 25% behavioral, 25% situational
  const techCount = Math.round(totalQuestions * 0.5);
  const behavCount = Math.round(totalQuestions * 0.25);
  const situCount = totalQuestions - techCount - behavCount;

  // Determine difficulty level based on experience
  const getDifficulty = () => {
    if (experience === 'senior') return 'hard';
    if (experience === 'mid') return 'normal';
    return 'easy';
  };
  const difficulty = getDifficulty();

  let id = 1;
  for (const t of techTemplates.slice(0, techCount)) {
    questions.push({
      id: id++,
      type: 'technical',
      text: t(field, skills),
      topic: skills[id % skills.length] || field,
      difficulty,
    });
  }
  for (const b of behavTemplates.slice(0, behavCount)) {
    questions.push({
      id: id++,
      type: 'behavioral',
      text: b(field),
      topic: 'communications',
      difficulty: experience === 'senior' ? 'hard' : 'normal',
    });
  }
  for (const s of situTemplates.slice(0, situCount)) {
    questions.push({
      id: id++,
      type: 'situational',
      text: s(field),
      topic: 'problem-solving',
      difficulty: experience === 'senior' ? 'hard' : 'normal',
    });
  }

  return questions.slice(0, totalQuestions);
}

function generateLocalFollowUp(originalQuestion, topic) {
  const templates = [
    `Can you elaborate more on your experience with ${topic}? Give a specific example.`,
    `What challenges have you faced when working with ${topic} and how did you overcome them?`,
    `How does your approach to ${topic} differ from industry best practices?`,
    `If you had to teach ${topic} to a junior developer, what key points would you cover?`,
    `What trade-offs did you consider when using ${topic} in your previous projects?`,
  ];
  const text = templates[Math.floor(Math.random() * templates.length)];
  return { type: 'technical', text, topic };
}

function generateLocalAnalysis(field, experience, answers) {
  const answeredQ = answers.filter(a => !a.skipped);
  const skippedQ = answers.filter(a => a.skipped);
  const qCount = Math.max(answeredQ.length, 1);

  const avgDuration = answeredQ.reduce((s, a) => s + (a.durationSeconds || 0), 0) / qCount;
  const fillerAvg = answeredQ.reduce((s, a) => s + (a.fillerWordCount || 0), 0) / qCount;
  const avgWords = answeredQ.reduce((s, a) => s + ((a.transcript || '').split(/\s+/).filter(Boolean).length), 0) / qCount;
  const avgLatency = answeredQ.reduce((s, a) => s + (a.responseLatencyMs || 0), 0) / qCount;

  // Voice bonus: if candidate answered by voice (listened + spoke), give bonus
  const voiceAnswers = answeredQ.filter(a => a.answeredByVoice);
  const voiceRatio = answeredQ.length > 0 ? voiceAnswers.length / answeredQ.length : 0;
  const hasVoiceBonus = voiceRatio >= 0.5;

  // Low-relevance rate
  const irrelevantCount = answeredQ.filter(a => a.lowRelevance).length;

  // Confidence based on latency: fast response = confident, slow = hesitating
  const latencyBonus = avgLatency < 3000 ? 1.5 : avgLatency < 6000 ? 0.5 : -1;
  const skippedPenalty = skippedQ.length * 1.5;

  // Smart scoring based on actual metrics
  let knowledge = Math.min(10, Math.round(5 + (avgWords / 30) * 3 + (avgDuration > 30 ? 1 : 0) - irrelevantCount * 2));
  let confidence = Math.min(10, Math.round(5 + latencyBonus + (avgDuration > 20 ? 2 : avgDuration > 10 ? 1 : 0) + (fillerAvg < 3 ? 1 : 0) + (hasVoiceBonus ? 1.5 : 0) - skippedPenalty));
  let communication = Math.min(10, Math.round(5 + (avgWords / 25) * 2 + (fillerAvg < 5 ? 1.5 : 0) + (hasVoiceBonus ? 1 : 0) - irrelevantCount));
  const voiceClarity = Math.min(10, Math.round(7 - fillerAvg * 0.5));

  knowledge = Math.max(0, knowledge);
  confidence = Math.max(0, confidence);
  communication = Math.max(0, communication);

  const overallScore = Math.round(((knowledge + confidence + communication + voiceClarity) / 4) * 10) / 10;

  let perQuestion = answers.map((a, i) => {
    const words = (a.transcript || '').split(/\s+/).filter(Boolean).length;
    const isSkipped = a.skipped;
    const isIrrelevant = a.lowRelevance;

    let score;
    const errors = [];
    const solutions = [];

    if (isSkipped) {
      score = 0;
      errors.push('Question was skipped — no answer provided');
      solutions.push('Try to attempt every question, even if you are unsure');
    } else if (isIrrelevant) {
      score = Math.max(0, Math.min(3, Math.round(2 + (words / 30))));
      errors.push('Answer was off-topic — did not address the actual question');
      solutions.push('Listen carefully to the question and directly address what is being asked');
    } else {
      score = Math.min(10, Math.round(4 + (words / 25) * 3 + (a.durationSeconds > 15 ? 1.5 : 0)));
      if (a.answeredByVoice) score = Math.min(10, score + 1);

      if (words < 15) {
        errors.push('Answer was too brief — lacks depth');
        solutions.push('Provide specific examples and technical details in your answers');
      }
      if (!a.answeredByVoice) {
        errors.push('Answered by typing instead of speaking — practicing verbal answers builds confidence');
        solutions.push('Try answering aloud using the microphone for higher scores');
      }
      if (a.answeredByVoice && a.fillerWordCount > 3) {
        errors.push('Excessive filler words reduce clarity');
        solutions.push('Pause briefly instead of using filler words like "um", "like", "basically"');
      }

      // Response latency feedback
      if (a.responseLatencyMs > 8000) {
        errors.push('Took too long to start answering — shows hesitation');
        solutions.push('Practice responding more quickly. A short pause is fine, but avoid long silences');
      } else if (a.responseLatencyMs > 4000 && errors.length < 3) {
        errors.push('Could improve response time — aim to start speaking sooner');
        solutions.push('Try to start your answer within a few seconds of hearing the question');
      }

      const topicPrefix = a.questionTopic?.toLowerCase().slice(0, 6) || '';
      const transcriptLower = (a.transcript || '').toLowerCase();
      const topicMentioned = topicPrefix.length > 2 && transcriptLower.includes(topicPrefix);
      if (!topicMentioned) {
        errors.push('Answer could be more technically specific to the topic');
        solutions.push('Reference ' + (a.questionTopic || 'the relevant concept') + ' directly in your answer');
      }

      if (a.answeredByVoice && errors.length === 0) {
        solutions.push('Excellent voice engagement — keep practicing this way!');
      } else if (!a.answeredByVoice && errors.length === 0) {
        solutions.push('Try using voice mode next time for bonus points');
      } else if (errors.length === 0) {
        solutions.push('Continue building on this strong foundation');
      }
    }

    return {
      questionText: a.questionText || 'Question ' + (i + 1),
      score: score,
      errors: errors.length ? errors : ['No major issues'],
      solutions,
    };
  });

  let hireDecision;
  if (overallScore >= 8) hireDecision = 'Strong Hire';
  else if (overallScore >= 6.5) hireDecision = 'Hire';
  else if (overallScore >= 4.5) hireDecision = 'Lean Hire';
  else hireDecision = 'No Hire';

  const voiceNote = hasVoiceBonus
    ? 'The candidate actively used voice mode, which demonstrates confidence and real interview readiness.'
    : 'The candidate mostly typed answers. Using voice mode in future interviews will better simulate real scenarios.';

  const skippedNote = skippedQ.length > 0
    ? skippedQ.length + ' question(s) were skipped. ' + (skippedQ.length > 2 ? 'This significantly impacts the overall assessment.' : 'Try to answer all questions next time.')
    : '';

  const irrelevanceNote = irrelevantCount > 0
    ? irrelevantCount + ' answer(s) were off-topic. Ensure you address the actual question being asked.'
    : '';

  const latencyNote = avgLatency < 3000
    ? 'Response time was excellent — quick and confident.'
    : avgLatency < 6000
    ? 'Response time was reasonable.'
    : 'Response time was slow — work on reducing hesitation.';

  const finalComments = 'Overall the candidate ' +
    (overallScore >= 7 ? 'demonstrated solid' : overallScore >= 5 ? 'showed adequate' : 'needs to improve') +
    ' knowledge for the ' + field + ' role. Their answers were ' +
    (avgWords > 20 ? 'generally detailed and well-structured' : 'somewhat brief and lacking depth') +
    '. ' + latencyNote + ' ' +
    (fillerAvg > 4 ? 'Filler words were noticeable and affected clarity.' : 'Communication was clear with minimal filler words.') +
    ' ' + voiceNote + ' ' + skippedNote + ' ' + irrelevanceNote + ' ' +
    (hireDecision === 'Strong Hire' || hireDecision === 'Hire'
      ? 'Recommend proceeding to the next round.'
      : 'Recommend more preparation before the next interview.');

  return {
    overallScore,
    categories: { knowledge, confidence, communication, voiceClarity },
    perQuestion: perQuestion.slice(0, 15),
    finalComments,
    hireDecision,
  };
}

// ─── Routes ───────────────────────────────────────────────

/**
 * POST /api/interview/questions
 * Tries Gemini first; falls back to local questions on quota errors.
 */
router.post('/questions', async (req, res) => {
  try {
    const { field, skills, experience, totalQuestions = 8 } = req.body;
    if (!field || !skills || !skills.length) {
      return res.status(400).json({ error: 'Field and skills are required.' });
    }

    const skillsList = skills.join(', ');
    // Determine difficulty level based on experience
    const difficultyLevel = experience === 'senior' ? 'hard' : experience === 'mid' ? 'moderate' : 'normal';
    const difficultyDesc = experience === 'senior'
      ? 'Ask ADVANCED, DEEP questions that test architectural thinking and complex problem-solving. Assume the candidate has years of experience.'
      : experience === 'mid'
      ? 'Ask MODERATE questions that test solid understanding but are not overly advanced. Mix practical and conceptual questions.'
      : experience === 'junior'
      ? 'Ask NORMAL but thorough questions that test fundamentals, best practices, and basic problem-solving.'
      : 'Ask FOUNDATIONAL questions suitable for beginners. Focus on basics, understanding concepts, and willingness to learn. Keep questions approachable.';

    const systemPrompt = `You are a senior technical interviewer at a top tech company. 
Generate ${totalQuestions} interview questions for a candidate applying for a ${field} role.
Their skills are: ${skillsList}. Experience level: ${experience}.
DIFFICULTY: ${difficultyLevel} — ${difficultyDesc}

Rules:
- Mix of technical, behavioral, and situational questions
- Questions must be RELEVANT to the candidate's field and skills
- For each question, assign a "topic" (the skill/area it tests) AND a "difficulty" (easy/normal/hard)
- Do NOT use generic questions — each question must test specific knowledge
- Return ONLY valid JSON, no explanation text

Format:
{
  "questions": [
    { "id": 1, "type": "technical|behavioral|situational", "text": "question here", "topic": "topic-name", "difficulty": "easy|normal|hard" },
    ...
  ]
}`;

    const userPrompt = `Generate ${totalQuestions} ${difficultyLevel}-difficulty interview questions for a ${experience} level ${field} candidate with skills in ${skillsList}.`;

    let questions;
    try {
      const raw = await askGemini(systemPrompt, userPrompt);
      const parsed = parseGeminiJson(raw, totalQuestions);
      questions = parsed.questions;
    } catch (geminiErr) {
      if (geminiErr.isQuotaError) {
        console.warn('Gemini quota — trying Groq...');
        try {
          const raw = await askGroq(systemPrompt, userPrompt);
          const parsed = parseGeminiJson(raw, totalQuestions);
          questions = parsed.questions;
        } catch (groqErr) {
          if (groqErr.isQuotaError) {
            console.warn('Groq also quota exceeded — using local fallback questions');
            questions = generateLocalQuestions(field, skills, experience, totalQuestions);
          } else {
            throw groqErr;
          }
        }
      } else {
        throw geminiErr;
      }
    }

    res.json({ questions: questions || [] });
  } catch (err) {
    console.error('POST /api/interview/questions error:', err);
    res.status(500).json({
      error: 'Failed to generate questions.',
      details: err.message,
    });
  }
});

/**
 * POST /api/interview/followup
 * Tries Gemini first; falls back to local follow-up on quota errors.
 */
router.post('/followup', async (req, res) => {
  try {
    const { field, originalQuestion, candidateAnswer, topic } = req.body;

    const systemPrompt = `You are a strict technical interviewer. 
The candidate is interviewing for a ${field} role.
They answered a question about "${topic}" poorly or incompletely.
Generate ONE follow-up question on the SAME topic to test their understanding more deeply.
Do NOT repeat the original question. Ask something different but related.
Return ONLY valid JSON: { "type": "technical", "text": "follow-up question here", "topic": "${topic}" }`;

    const userPrompt = `Original question: "${originalQuestion}"
Candidate's answer: "${candidateAnswer || '(no answer given)'}"

Generate a follow-up question on "${topic}" that tests deeper understanding.`;

    let followup;
    try {
      const raw = await askGemini(systemPrompt, userPrompt);
      followup = parseGeminiJson(raw);
    } catch (geminiErr) {
      if (geminiErr.isQuotaError) {
        console.warn('Gemini quota — trying Groq for follow-up...');
        try {
          const raw = await askGroq(systemPrompt, userPrompt);
          followup = parseGeminiJson(raw);
        } catch (groqErr) {
          if (groqErr.isQuotaError) {
            console.warn('Groq also quota exceeded — using local follow-up fallback');
            followup = generateLocalFollowUp(originalQuestion, topic);
          } else {
            throw groqErr;
          }
        }
      } else {
        throw geminiErr;
      }
    }

    res.json({ followup });
  } catch (err) {
    console.error('POST /api/interview/followup error:', err);
    res.status(500).json({ error: 'Failed to generate follow-up question', details: err.message });
  }
});

/**
 * POST /api/interview/analyze
 * Tries Gemini first; falls back to local analysis on quota errors.
 */
router.post('/analyze', async (req, res) => {
  try {
    const { field, experience, answers } = req.body;
    if (!answers || !answers.length) {
      return res.status(400).json({ error: 'No answers provided for analysis.' });
    }

    const answersText = answers
      .map(
        (a, i) =>
          `Q${i + 1} [${a.questionType}] (mode: ${a.answeredByVoice ? 'voice' : 'typed'}, ${a.durationSeconds}s, ${a.fillerWordCount} filler words):\nQuestion: ${a.questionText}\nAnswer: ${a.transcript}`
      )
      .join('\n\n');

    const systemPrompt = `You are a STRICT HR manager conducting a performance review.
Analyze the candidate's answers for a ${field} role (experience: ${experience}). 
Be honest and critical — this is NOT practice, this is a real evaluation.

IMPORTANT SCORING RULES:
- Each answer has a mode: "voice" (candidate listened to the question and spoke answer) or "typed" (candidate read and typed).
- Voice-mode answers demonstrate better communication & confidence ✅ +1-2 bonus to confidence & communication
- Typed answers may show more hesitation — score normally but note if they avoided speaking

Score each category out of 10:
1. Knowledge — does the candidate actually understand the concepts?
2. Confidence — do they sound sure or hesitant? (+bonus for voice mode)
3. Communication — are answers clear and structured? (+bonus for voice mode)
4. Voice Clarity — ignore filler words
    
Also give per-question scores and very brief, direct feedback.
At the end, give a hire decision: "Strong Hire" | "Hire" | "Lean Hire" | "No Hire"

Return ONLY valid JSON (no markdown, no explanation):
{
  "overallScore": <number 1-10>,
  "categories": { "confidence": <1-10>, "knowledge": <1-10>, "communication": <1-10>, "voiceClarity": <1-10> },
  "perQuestion": [
    { "questionText": "...", "score": <1-10>, "errors": ["concise error"], "solutions": ["concise fix"] }
  ],
  "finalComments": "2-3 sentence direct summary",
  "hireDecision": "Strong Hire | Hire | Lean Hire | No Hire"
}`;

    const userPrompt = `Here are the candidate's answers:\n\n${answersText}\n\nGive a strict HR evaluation.`;

    let analysis;
    try {
      const raw = await askGemini(systemPrompt, userPrompt);
      analysis = parseGeminiJson(raw);
    } catch (geminiErr) {
      if (geminiErr.isQuotaError) {
        console.warn('Gemini quota — trying Groq for analysis...');
        try {
          const raw = await askGroq(systemPrompt, userPrompt);
          analysis = parseGeminiJson(raw);
        } catch (groqErr) {
          if (groqErr.isQuotaError) {
            console.warn('Groq also quota exceeded — using local analysis fallback');
            analysis = generateLocalAnalysis(field, experience, answers);
          } else {
            throw groqErr;
          }
        }
      } else {
        throw geminiErr;
      }
    }

    res.json(analysis);
  } catch (err) {
    console.error('POST /api/interview/analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze answers', details: err.message });
  }
});

// ─── Helper: get user from token ────────────────────────
function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * POST /api/interview/save
 * Save a completed interview record to MongoDB
 */
router.post('/save', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const {
      field, experience, skills,
      questions, totalQuestions, answers,
      result, // AnalysisResult
      cheated, cheatReason,
      durationMinutes,
    } = req.body;

    if (!field) {
      return res.status(400).json({ error: 'Field is required.' });
    }

    const safeAnswers = answers || [];
    const answeredCount = safeAnswers.filter(a => !a.skipped).length;
    const skippedCount = safeAnswers.filter(a => a.skipped).length;

    const interview = new Interview({
      studentId: tokenData.id,
      field,
      experience: experience || 'fresher',
      skills: skills || [],
      questions: questions || [],
      totalQuestions: totalQuestions || questions?.length || 0,
      answers: answers || [],
      overallScore: result?.overallScore ?? 0,
      categories: result?.categories || { confidence: 0, knowledge: 0, communication: 0, voiceClarity: 0 },
      perQuestionFeedback: result?.perQuestion || [],
      finalComments: result?.finalComments || '',
      hireDecision: result?.hireDecision || 'No Hire',
      cheated: !!cheated,
      cheatReason: cheatReason || '',
      durationMinutes: durationMinutes || 0,
      answeredCount,
      skippedCount,
      completedAt: new Date(),
    });

    await interview.save();

    res.json({
      success: true,
      interviewId: interview._id,
    });
  } catch (err) {
    console.error('POST /api/interview/save error:', err);
    res.status(500).json({ error: 'Failed to save interview record.' });
  }
});

/**
 * GET /api/interview/recent/:limit?
 * Get recent interviews for the logged-in student
 */
router.get('/recent/:limit?', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const limit = parseInt(req.params.limit) || 10;

    const interviews = await Interview.find({ studentId: tokenData.id })
      .sort({ completedAt: -1 })
      .limit(limit)
      .select('field overallScore hireDecision cheated answeredCount completedAt durationMinutes')
      .lean();

    res.json({ interviews });
  } catch (err) {
    console.error('GET /api/interview/recent error:', err);
    res.status(500).json({ error: 'Failed to fetch recent interviews.' });
  }
});

// ─── Helpers ──────────────────────────────────────────────

function parseGeminiJson(raw, maxItems) {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (maxItems && parsed.questions) return { questions: parsed.questions.slice(0, maxItems) };
    return parsed;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (maxItems && parsed.questions) return { questions: parsed.questions.slice(0, maxItems) };
        return parsed;
      } catch { /* silent */ }
    }
    throw new Error('Failed to parse AI response as JSON. Raw: ' + raw.slice(0, 300));
  }
}

module.exports = router;
