import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai'
import { z } from 'zod'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface NoteInsights {
  summary: string
  action_items: string[]
  suggested_title: string
}

const insightsSchema = z.object({
  summary: z.string(),
  action_items: z.array(z.string()),
  suggested_title: z.string(),
})

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    action_items: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    suggested_title: { type: SchemaType.STRING },
  },
  required: ['summary', 'action_items', 'suggested_title'],
}

export async function generateNoteInsights(content: string): Promise<NoteInsights> {
  const truncated = content.slice(0, 8000)

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  })

  const prompt = `You are a notes assistant. Analyze the note below and return JSON with three fields:
- summary: 2-3 sentences capturing the core idea
- action_items: array of concrete tasks mentioned in the note (empty array if none)
- suggested_title: a 3-7 word title that captures the essence

Note content:
"""
${truncated}
"""`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('AI returned invalid output')
  }

  const parsed = insightsSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error('AI returned invalid output')
  }
  return parsed.data
}
