import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageBase64, model = 'gemini-1.5-flash' } = await request.json();
    
    if (!imageBase64) return NextResponse.json({ error: 'No image' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcribe this Hebrew text exactly as is." }, // System prompt
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ success: true, text });

  } catch (error) {
    console.error('Gemini Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}