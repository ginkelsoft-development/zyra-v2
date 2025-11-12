import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiToken = searchParams.get('apiToken');

  if (!apiToken) {
    return NextResponse.json({ error: 'API token is required' }, { status: 400 });
  }

  try {
    const response = await fetch('https://envoyer.io/api/projects', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
      }
      throw new Error(`Envoyer API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to simpler format
    const projects = data.projects.map((project: any) => ({
      id: project.id,
      name: project.name,
      repository: project.repository,
      type: project.type,
    }));

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Envoyer API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Envoyer projects' },
      { status: 500 }
    );
  }
}
