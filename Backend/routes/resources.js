const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const JWT_SECRET = process.env.JWT_SECRET || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Helper: call Groq ─────────────────────────────────────

async function askGroq(systemPrompt, userPrompt) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your-groq-api-key') {
    return { error: 'API key not configured' };
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
      temperature: 0.5,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ─── Helper: generate profile hash ─────────────────────────

function generateProfileHash(student) {
  const data = [
    student.field || '',
    (student.skills || []).sort().join(','),
    student.experience || '',
  ].join('|||');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'res_v1_' + Math.abs(hash).toString(36);
}

// ─── Helper: get user from token ──────────────────────────

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

// ─── GET /api/resources — get cached resources ────────────

router.get('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const student = await Student.findById(tokenData.id).select('-password').lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const profileHash = generateProfileHash(student);
    const cached = student.cachedResources;

    if (cached && cached.items && cached.items.length > 0 && cached.profileHash === profileHash) {
      return res.json({
        resources: cached.items,
        cached: true,
        generatedAt: cached.generatedAt,
        field: student.field || '',
        skills: student.skills || [],
      });
    }

    // No valid cache — return empty
    res.json({
      resources: [],
      cached: false,
      field: student.field || '',
      skills: student.skills || [],
    });

  } catch (err) {
    console.error('GET /api/resources error:', err);
    res.status(500).json({ error: 'Failed to fetch resources.' });
  }
});

// ─── POST /api/resources — generate new AI resources ──────

router.post('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const student = await Student.findById(tokenData.id).select('-password').lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const field = student.field || 'general';
    const skills = student.skills || [];
    const experience = student.experience || 'fresher';

    const systemPrompt = `You are a career guidance expert and learning advisor. Your job is to recommend the BEST free learning resources for a student based on their field and skills.

For each resource, provide:
- title: Short, clear name of the resource
- url: Direct link (make it real and working — use official sites)
- description: 1 sentence explaining what the resource offers
- type: One of: "course", "video", "article", "practice", "docs", "tool"
- reason: Why this resource is good for THIS specific student

Rules:
- Recommend 6-8 resources total
- Mix of types (courses, videos, articles, practice platforms, documentation, tools)
- ALL resources must be real, popular, and free (or have a free tier)
- Prioritize resources that match the student's specific skills
- Include a variety: beginner-friendly AND advanced resources
- Make URLs real and functional (official websites, YouTube channels, well-known platforms)

Return ONLY valid JSON array:
[
  {
    "title": "...",
    "url": "https://...",
    "description": "...",
    "type": "course|video|article|practice|docs|tool",
    "reason": "..."
  }
]`;

    const userPrompt = `Student Profile:
- Field: ${field}
- Skills: ${skills.join(', ')}
- Experience Level: ${experience}

Recommend 6-8 personalized learning resources to help this student advance in their field and skills. Focus on practical, hands-on resources.`;

    const raw = await askGroq(systemPrompt, userPrompt);

    let resources = [];
    if (raw && !raw.error) {
      try {
        // Try direct JSON parse
        const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          resources = parsed;
        } else if (parsed.resources && Array.isArray(parsed.resources)) {
          resources = parsed.resources;
        }
      } catch {
        // Try to extract JSON array from text
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            resources = JSON.parse(match[0]);
          } catch { /* use empty array */ }
        }
      }
    }

    // Ensure valid structure
    resources = resources.slice(0, 10).map((r, i) => ({
      id: 'ai_' + i,
      title: r.title || 'Resource ' + (i + 1),
      url: r.url || '#',
      description: r.description || '',
      type: ['course', 'video', 'article', 'practice', 'docs', 'tool'].includes(r.type) ? r.type : 'article',
      reason: r.reason || '',
      difficulty: r.difficulty || 'beginner',
    }));

    // Cache the results
    const profileHash = generateProfileHash(student);
    await Student.findByIdAndUpdate(tokenData.id, {
      $set: {
        'cachedResources.items': resources,
        'cachedResources.profileHash': profileHash,
        'cachedResources.generatedAt': new Date(),
      },
    });

    res.json({
      resources,
      cached: false,
      generatedAt: new Date().toISOString(),
      field,
      skills,
    });

  } catch (err) {
    console.error('POST /api/resources error:', err);
    res.status(500).json({
      error: 'Failed to generate resources.',
      details: err.message,
    });
  }
});

module.exports = router;
