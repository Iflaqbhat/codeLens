import OpenAI from 'openai'

// Provider-agnostic: works with OpenAI, Google Gemini, OpenRouter, Groq, Ollama...
// Just swap AI_BASE_URL + AI_MODEL in .env
const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
})

const MODEL = process.env.AI_MODEL || 'gemini-2.5-flash'

export interface TestCase {
  description: string
  input: string
  expectedOutput: string
}

export interface ReviewResult {
  bugs: string[]
  styleIssues: string[]
  complexityScore: number
  securityConcerns: string[]
  overallScore: number
  testCases: TestCase[]
  summary: string
  sarcasticRemark: string
  explanationEnglish: string
  explanationHinglish: string
}

export interface CodeExplanation {
  english: string
  hinglish: string
}

const REVIEW_PROMPT = `You are an expert code reviewer with a sharp tongue. Analyze the code below and return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):

{
  "bugs": ["list of bugs or potential bugs found"],
  "styleIssues": ["list of style/convention issues"],
  "complexityScore": <number 0-100 where 100 is most complex>,
  "securityConcerns": ["list of security issues"],
  "overallScore": <number 0-100 quality score>,
  "testCases": [
    {
      "description": "what this test checks",
      "input": "the input to the function",
      "expectedOutput": "the expected output"
    }
  ],
  "summary": "2-3 sentence summary",
  "sarcasticRemark": "one punchy Hinglish line reacting to this code",
  "explanationEnglish": "what this code does, explained simply",
  "explanationHinglish": "same explanation but in Hinglish"
}

SARCASTIC REMARK RULES (very important):
- Written in Hinglish: Hindi written in English letters, mixed casually with English words
- ONE sentence maximum, plus exactly one emoji at the end
- Tone must match the score:
  * score 0-39 → savage roast. Examples of the vibe: "Bhai kya hag diya hai ye", "Ye code dekh ke compiler bhi ro diya", "Bhai ne code likha hai ya error generator banaya hai"
  * score 40-69 → playful teasing. Vibe: "Chal theek hai, par production mein mat daalna", "Kaam chal jayega, par senior log hasenge"
  * score 70-89 → impressed with a jab. Vibe: "Wah bhai, almost senior level — bas galtiyan reh gayi", "Solid hai, thoda polish karta toh kamaal hota"
  * score 90-100 → full praise. Vibe: "Bhai wah! Kya code likha hai", "Ekdum kadak, aise hi likhte raho"
- NEVER copy the examples verbatim — invent a fresh line in the same spirit every time
- Keep it funny but not abusive

OTHER RULES:
- Generate 3-5 test cases covering normal cases, edge cases, and error cases
- Be specific and actionable in feedback
- explanationEnglish: 2-4 short sentences in plain English explaining what this code DOES (not how it's written) — simple enough for a junior dev
- explanationHinglish: the same meaning but conversational Hinglish — Hindi written in English letters, casual chai-pe-charcha tone. Vibe: "Ye function basically files ko read karke unka size count karta hai..."
- Return ONLY the JSON object, nothing else

CODE TO REVIEW:
\`\`\`{language}
{code}
\`\`\``

function buildPrompt(code: string, language: string): string {
  return REVIEW_PROMPT.replace('{language}', language).replace('{code}', code)
}

async function complete(prompt: string): Promise<string> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })
  return completion.choices[0]?.message?.content ?? ''
}

export async function reviewCode(code: string, language: string): Promise<ReviewResult> {
  const text = await complete(buildPrompt(code, language))

  // Some models wrap JSON in markdown fences despite instructions — strip them
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const result = JSON.parse(cleaned) as ReviewResult

  if (typeof result.overallScore !== 'number' || !Array.isArray(result.testCases)) {
    throw new Error('AI returned invalid structure — check model output')
  }

  if (!result.sarcasticRemark) {
    result.sarcasticRemark = 'Review poora ho gaya, remark dene ka mann nahi tha 🤷'
  }

  return result
}

const EXPLAIN_PROMPT = `Explain WHAT the following {language} code does, in simple terms — its purpose and behavior, not line-by-line syntax. Audience: a junior developer seeing it for the first time.

Return a raw JSON object (no markdown):
{
  "english": "2-4 short sentences in plain English",
  "hinglish": "same meaning, conversational Hinglish — Hindi written in English letters, like explaining to a friend over chai"
}

CODE:
\`\`\`{language}
{code}
\`\`\``

export async function explainCode(code: string, language: string): Promise<CodeExplanation> {
  const prompt = EXPLAIN_PROMPT.replace(/\{language\}/g, language).replace('{code}', code.slice(0, MAX_EXPLAIN_CHARS))
  const text = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  }).then((c) => c.choices[0]?.message?.content ?? '')

  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned) as CodeExplanation

  if (!parsed.english || !parsed.hinglish) {
    throw new Error('Explanation missing from AI response')
  }
  return parsed
}

const MAX_EXPLAIN_CHARS = 40000

const IMPROVE_PROMPT = `You are a senior software engineer. Rewrite the following {language} code to fix every issue found in review:

{feedback}

REQUIREMENTS:
- Fix all bugs, security issues, and style problems mentioned above
- Keep the original purpose and public behavior intact
- Add brief comments only where the fix is non-obvious
- Production-quality: proper error handling, validation, clean naming

Return ONLY the raw rewritten {language} code — no markdown fences, no explanations, no commentary.

ORIGINAL CODE:
\`\`\`{language}
{code}
\`\`\``

export async function generateImprovedCode(code: string, language: string, feedback: string): Promise<string> {
  const prompt = IMPROVE_PROMPT
    .replace(/\{language\}/g, language)
    .replace('{feedback}', feedback.slice(0, 3000))
    .replace('{code}', code)

  const completion = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = completion.choices[0]?.message?.content ?? ''
  // Strip fences if the model added them anyway
  return text.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()
}
