import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // חשוב כדי לקבל תמיד גרסה עדכנית

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'stable';
    
    // שימוש ב-Public API של גיטהאב (או עם טוקן אם יש מגבלת בקשות)
    const url = type === 'dev' 
      ? 'https://api.github.com/repos/Y-PLONI/otzaria/releases'
      : 'https://api.github.com/repos/Y-PLONI/otzaria/releases/latest';
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Otzaria-Website'
    };

    // אם יש טוקן בשרת, נשתמש בו להגדיל מכסה
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, { headers, next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GitHub Releases Error:', error);
    return NextResponse.json({ error: 'Failed to fetch releases' }, { status: 500 });
  }
}