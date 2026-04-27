import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function readAwsLocationConfig() {
  return {
    apiKey: process.env.AWS_LOCATION_API_KEY || process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY || process.env.VITE_AWS_LOCATION_API_KEY,
    region: process.env.AWS_LOCATION_REGION || process.env.NEXT_PUBLIC_AWS_LOCATION_REGION || process.env.VITE_AWS_LOCATION_REGION || 'eu-central-1'
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const { apiKey, region } = readAwsLocationConfig();

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'AWS_LOCATION_API_KEY missing',
        message: 'Hiányzik az AWS Location API kulcs. Vercelben server-side env-ként add meg: AWS_LOCATION_API_KEY és AWS_LOCATION_REGION.'
      },
      { status: 503 }
    );
  }

  try {
    const awsUrl = new URL(`https://places.geo.${region}.amazonaws.com/v2/autocomplete`);
    awsUrl.searchParams.set('query', query);
    awsUrl.searchParams.set('maxResults', '6');
    awsUrl.searchParams.set('language', 'hu');

    const response = await fetch(awsUrl, {
      method: 'GET',
      headers: {
        'X-Amz-Api-Key': apiKey
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          error: 'AWS_LOCATION_REQUEST_FAILED',
          message: 'Az AWS Location címkeresés nem elérhető vagy a kulcs/régió nincs jól összepárosítva.',
          status: response.status,
          details: details.slice(0, 500)
        },
        { status: response.status }
      );
    }

    const payload = await response.json();
    const suggestions = (payload?.ResultItems ?? [])
      .map((item: { Title?: string; Address?: { Label?: string } }) => item.Address?.Label || item.Title)
      .filter((label: string | undefined): label is string => Boolean(label));

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'AWS_LOCATION_PROXY_ERROR',
        message: error instanceof Error ? error.message : 'Ismeretlen AWS Location proxy hiba.'
      },
      { status: 500 }
    );
  }
}
