export const runtime = 'nodejs'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const EXTRACTION_PROMPT = `
You are a strict document classifier and extractor.
Identify document type: Driving License, Birth Certificate, Death Certificate, Marriage Certificate, School Marksheet, Hospital Bill
Extract: documentType, name, year
Return ONLY valid JSON: { "documentType": "", "name": "", "year": "" }
`

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const apiKey = process.env.GEMINI_API_KEY

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64File = buffer.toString('base64')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: EXTRACTION_PROMPT },
            {
              inlineData: {
                mimeType: file.type || 'application/pdf',
                data: base64File,
              },
            },
          ],
        },
      ],
    })

    let text = result.response.text().trim()
    if (text.startsWith('```')) {
      text = text.replace(/```json|```/g, '').trim()
    }

    const parsed = JSON.parse(text) as {
      documentType?: string
      name?: string
      year?: string
    }

    return NextResponse.json({ data: parsed })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
