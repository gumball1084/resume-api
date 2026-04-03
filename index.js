const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "50kb" }));

// Rate limiting (adjust per your RapidAPI plan tiers)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: "Too many requests. Please upgrade your plan.",
    status: 429,
  },
});
app.use(limiter);

// ─── RapidAPI Key Validation Middleware ───────────────────────────────────────
// RapidAPI injects X-RapidAPI-Proxy-Secret for security
const validateRapidAPIRequest = (req, res, next) => {
  const proxySecret = req.headers["x-rapidapi-proxy-secret"];
  const rapidAPISecret = process.env.RAPIDAPI_PROXY_SECRET;

  // Skip validation in development mode
  if (!rapidAPISecret) return next();

  if (!proxySecret || proxySecret !== rapidAPISecret) {
    return res.status(401).json({
      error: "Unauthorized. Only requests via RapidAPI are allowed.",
      status: 401,
    });
  }
  next();
};

app.use(validateRapidAPIRequest);

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Extract skills from resume text using keyword matching + scoring
 */
function extractSkills(text) {
  const techSkills = [
    "javascript", "python", "java", "c++", "c#", "typescript", "react", "vue", "angular",
    "node.js", "express", "django", "flask", "spring", "sql", "mysql", "postgresql",
    "mongodb", "redis", "docker", "kubernetes", "aws", "azure", "gcp", "git", "linux",
    "html", "css", "graphql", "rest", "api", "machine learning", "ai", "tensorflow",
    "pytorch", "scikit-learn", "pandas", "numpy", "tableau", "power bi", "excel",
    "figma", "photoshop", "sketch", "xd", "swift", "kotlin", "flutter", "react native",
    "next.js", "nuxt", "webpack", "devops", "ci/cd", "agile", "scrum",
  ];
  const softSkills = [
    "leadership", "communication", "teamwork", "problem solving", "critical thinking",
    "time management", "project management", "collaboration", "adaptability", "creativity",
    "attention to detail", "analytical", "presentation", "negotiation", "mentoring",
  ];

  const lowerText = text.toLowerCase();
  const foundTech = techSkills.filter((s) => lowerText.includes(s));
  const foundSoft = softSkills.filter((s) => lowerText.includes(s));

  return { technical: foundTech, soft: foundSoft };
}

/**
 * Calculate ATS (Applicant Tracking System) score
 */
function calculateATSScore(resumeText) {
  const checks = {
    hasEmail: /[\w.-]+@[\w.-]+\.\w{2,}/.test(resumeText),
    hasPhone: /(\+?\d[\d\s\-().]{7,}\d)/.test(resumeText),
    hasLinkedIn: /linkedin\.com\/in\//i.test(resumeText),
    hasGitHub: /github\.com\//i.test(resumeText),
    hasWorkExperience:
      /(experience|work history|employment|position|role)/i.test(resumeText),
    hasEducation: /(education|university|college|degree|bachelor|master|phd)/i.test(resumeText),
    hasSkillsSection: /(skills|technologies|competencies|tools)/i.test(resumeText),
    hasSummary: /(summary|objective|profile|about)/i.test(resumeText),
    hasBulletPoints: /[•\-*]\s+\w/.test(resumeText),
    hasQuantifiedResults: /\d+[\s%+x]|(increased|decreased|improved|reduced|grew|saved)\s+\w+\s+by\s+\d/i.test(resumeText),
    hasActionVerbs:
      /(developed|built|managed|led|created|designed|implemented|improved|achieved|delivered|launched)/i.test(resumeText),
    hasDates: /\b(20\d{2}|19\d{2})\b/.test(resumeText),
    lengthOk: resumeText.length >= 400 && resumeText.length <= 8000,
    noPersonalPronouns: !/\b(I am|I have|I was|my hobby|hobbies)\b/i.test(resumeText),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const score = Math.round((passed / total) * 100);

  const issues = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([key]) => {
      const messages = {
        hasEmail: "Missing email address",
        hasPhone: "Missing phone number",
        hasLinkedIn: "Consider adding LinkedIn profile URL",
        hasGitHub: "Consider adding GitHub profile URL",
        hasWorkExperience: "Work experience section not detected",
        hasEducation: "Education section not detected",
        hasSkillsSection: "No dedicated skills section found",
        hasSummary: "No professional summary/objective",
        hasBulletPoints: "Use bullet points for better ATS readability",
        hasQuantifiedResults: "Add quantified achievements (e.g., 'increased sales by 30%')",
        hasActionVerbs: "Use strong action verbs to start bullet points",
        hasDates: "Add dates to work experience and education",
        lengthOk:
          resumeText.length < 400
            ? "Resume too short (aim for 400-800 words)"
            : "Resume too long (keep under ~800 words for ATS)",
        noPersonalPronouns: "Avoid personal pronouns (I, my) in resume",
      };
      return messages[key] || key;
    });

  return { score, passed, total, issues, checks };
}

/**
 * Calculate job match score between resume and job description
 */
function calculateJobMatch(resumeText, jobDescription) {
  const lower_resume = resumeText.toLowerCase();
  const lower_job = jobDescription.toLowerCase();

  // Extract words from job description (removing stopwords)
  const stopwords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "we", "you", "our", "your", "their", "this", "that", "these", "those",
  ]);

  const jobWords = lower_job
    .replace(/[^a-z0-9\s+#.]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));

  const uniqueJobWords = [...new Set(jobWords)];

  // Find keyword matches
  const matched = uniqueJobWords.filter((w) => lower_resume.includes(w));
  const missing = uniqueJobWords.filter(
    (w) => !lower_resume.includes(w) && w.length > 3
  );

  const matchScore = Math.round((matched.length / Math.max(uniqueJobWords.length, 1)) * 100);

  // Extract required years of experience from JD
  const yearsMatch = jobDescription.match(/(\d+)\+?\s*years?\s*(of\s+)?experience/i);
  const requiredYears = yearsMatch ? parseInt(yearsMatch[1]) : null;

  // Detect seniority level from JD
  let seniorityLevel = "mid-level";
  if (/\b(junior|entry.level|0-2 years|1-2 years)\b/i.test(jobDescription))
    seniorityLevel = "junior";
  else if (/\b(senior|sr\.|5\+|7\+|lead|principal)\b/i.test(jobDescription))
    seniorityLevel = "senior";
  else if (/\b(manager|director|vp|vice president|head of)\b/i.test(jobDescription))
    seniorityLevel = "management";

  // Top missing keywords to add
  const topMissing = missing
    .filter((w) => w.length > 4)
    .sort((a, b) => {
      // Prioritize words that appear more in JD
      const aCount = (lower_job.match(new RegExp(a, "g")) || []).length;
      const bCount = (lower_job.match(new RegExp(b, "g")) || []).length;
      return bCount - aCount;
    })
    .slice(0, 10);

  return {
    score: matchScore,
    matchedKeywords: matched.slice(0, 20),
    missingKeywords: topMissing,
    totalJobKeywords: uniqueJobWords.length,
    matchedCount: matched.length,
    requiredExperience: requiredYears ? `${requiredYears}+ years` : "Not specified",
    seniorityLevel,
  };
}

/**
 * Generate improvement suggestions based on analysis
 */
function generateSuggestions(atsResult, skills, jobMatch = null) {
  const suggestions = [];

  if (atsResult.score < 60) {
    suggestions.push({
      priority: "high",
      category: "ATS",
      message: "Your resume has critical ATS issues. Many applicant tracking systems will filter it out before a human sees it.",
    });
  }

  if (!atsResult.checks.hasQuantifiedResults) {
    suggestions.push({
      priority: "high",
      category: "Impact",
      message: "Add numbers and metrics to your achievements. E.g., 'Reduced load time by 40%' or 'Managed team of 8 engineers'.",
    });
  }

  if (!atsResult.checks.hasActionVerbs) {
    suggestions.push({
      priority: "high",
      category: "Language",
      message: "Start bullet points with strong action verbs: Developed, Built, Led, Engineered, Designed, Optimized.",
    });
  }

  if (!atsResult.checks.hasSummary) {
    suggestions.push({
      priority: "medium",
      category: "Structure",
      message: "Add a 2-3 line professional summary at the top tailored to the role you're applying for.",
    });
  }

  if (skills.technical.length < 5) {
    suggestions.push({
      priority: "medium",
      category: "Skills",
      message: "Your technical skills section appears thin. List all relevant technologies, frameworks, and tools you know.",
    });
  }

  if (jobMatch && jobMatch.missingKeywords.length > 0) {
    suggestions.push({
      priority: "high",
      category: "Job Match",
      message: `Naturally incorporate these missing keywords from the job description: ${jobMatch.missingKeywords.slice(0, 5).join(", ")}.`,
    });
  }

  if (!atsResult.checks.hasLinkedIn) {
    suggestions.push({
      priority: "low",
      category: "Contact",
      message: "Add your LinkedIn profile URL to increase credibility and discoverability.",
    });
  }

  return suggestions;
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.json({
    api: "Resume Analyzer & Job Match API",
    version: "1.0.0",
    status: "operational",
    endpoints: [
      "GET  /health",
      "POST /analyze/resume",
      "POST /analyze/job-match",
      "POST /analyze/full",
      "POST /extract/skills",
    ],
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * POST /analyze/resume
 * Analyze a resume and return ATS score + skills
 */
app.post("/analyze/resume", (req, res) => {
  const { resume_text } = req.body;

  if (!resume_text || typeof resume_text !== "string") {
    return res.status(400).json({
      error: "Missing required field: resume_text (string)",
      status: 400,
    });
  }

  if (resume_text.trim().length < 50) {
    return res.status(400).json({
      error: "resume_text is too short. Please provide a full resume.",
      status: 400,
    });
  }

  const ats = calculateATSScore(resume_text);
  const skills = extractSkills(resume_text);
  const suggestions = generateSuggestions(ats, skills);

  const overallGrade =
    ats.score >= 85 ? "A" :
    ats.score >= 70 ? "B" :
    ats.score >= 55 ? "C" :
    ats.score >= 40 ? "D" : "F";

  return res.json({
    success: true,
    data: {
      ats_score: ats.score,
      grade: overallGrade,
      checks_passed: ats.passed,
      total_checks: ats.total,
      issues: ats.issues,
      skills: {
        technical: skills.technical,
        soft: skills.soft,
        total_count: skills.technical.length + skills.soft.length,
      },
      suggestions: suggestions,
      word_count: resume_text.trim().split(/\s+/).length,
    },
  });
});

/**
 * POST /analyze/job-match
 * Score how well a resume matches a specific job description
 */
app.post("/analyze/job-match", (req, res) => {
  const { resume_text, job_description } = req.body;

  if (!resume_text || !job_description) {
    return res.status(400).json({
      error: "Missing required fields: resume_text and job_description",
      status: 400,
    });
  }

  const jobMatch = calculateJobMatch(resume_text, job_description);
  const skills = extractSkills(resume_text);

  const matchLevel =
    jobMatch.score >= 80 ? "Excellent Match" :
    jobMatch.score >= 60 ? "Good Match" :
    jobMatch.score >= 40 ? "Partial Match" : "Poor Match";

  return res.json({
    success: true,
    data: {
      match_score: jobMatch.score,
      match_level: matchLevel,
      matched_keywords: jobMatch.matchedKeywords,
      missing_keywords: jobMatch.missingKeywords,
      keywords_analyzed: jobMatch.totalJobKeywords,
      keywords_matched: jobMatch.matchedCount,
      required_experience: jobMatch.requiredExperience,
      seniority_level: jobMatch.seniorityLevel,
      recommendation:
        jobMatch.score >= 60
          ? "Strong candidate. Apply with confidence."
          : "Tailor your resume by adding the missing keywords before applying.",
    },
  });
});

/**
 * POST /analyze/full
 * Full analysis: ATS score + job match + skills + suggestions (premium endpoint)
 */
app.post("/analyze/full", (req, res) => {
  const { resume_text, job_description } = req.body;

  if (!resume_text) {
    return res.status(400).json({
      error: "Missing required field: resume_text",
      status: 400,
    });
  }

  const ats = calculateATSScore(resume_text);
  const skills = extractSkills(resume_text);
  const jobMatch = job_description
    ? calculateJobMatch(resume_text, job_description)
    : null;
  const suggestions = generateSuggestions(ats, skills, jobMatch);

  const overallScore = jobMatch
    ? Math.round(ats.score * 0.5 + jobMatch.score * 0.5)
    : ats.score;

  const overallGrade =
    overallScore >= 85 ? "A" :
    overallScore >= 70 ? "B" :
    overallScore >= 55 ? "C" :
    overallScore >= 40 ? "D" : "F";

  return res.json({
    success: true,
    data: {
      overall_score: overallScore,
      grade: overallGrade,
      ats_analysis: {
        score: ats.score,
        checks_passed: ats.passed,
        total_checks: ats.total,
        issues: ats.issues,
      },
      job_match: jobMatch
        ? {
            score: jobMatch.score,
            match_level:
              jobMatch.score >= 80 ? "Excellent" :
              jobMatch.score >= 60 ? "Good" :
              jobMatch.score >= 40 ? "Partial" : "Poor",
            matched_keywords: jobMatch.matchedKeywords,
            missing_keywords: jobMatch.missingKeywords,
            seniority_level: jobMatch.seniorityLevel,
            required_experience: jobMatch.requiredExperience,
          }
        : null,
      skills: {
        technical: skills.technical,
        soft: skills.soft,
        total_count: skills.technical.length + skills.soft.length,
      },
      suggestions: suggestions,
      metadata: {
        word_count: resume_text.trim().split(/\s+/).length,
        analyzed_at: new Date().toISOString(),
      },
    },
  });
});

/**
 * POST /extract/skills
 * Lightweight endpoint: extract only skills from resume text
 */
app.post("/extract/skills", (req, res) => {
  const { resume_text } = req.body;

  if (!resume_text) {
    return res.status(400).json({
      error: "Missing required field: resume_text",
      status: 400,
    });
  }

  const skills = extractSkills(resume_text);

  return res.json({
    success: true,
    data: {
      technical_skills: skills.technical,
      soft_skills: skills.soft,
      technical_count: skills.technical.length,
      soft_count: skills.soft.length,
    },
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.path}`,
    status: 404,
    available_endpoints: [
      "GET  /health",
      "POST /analyze/resume",
      "POST /analyze/job-match",
      "POST /analyze/full",
      "POST /extract/skills",
    ],
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Resume Analyzer API running on port ${PORT}`);
});

module.exports = app;
