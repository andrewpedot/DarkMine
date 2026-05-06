import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }
    
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const { data: session, error: sessionError } = await supabase
      .from('search_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const { data: results, error: resultsError } = await supabase
      .from('analysis_results')
      .select(`
        id,
        niche_id,
        subniche_id,
        opportunity_score,
        faceless_score,
        comment_gold_score,
        outlier_multiplier,
        views_per_day,
        score_breakdown,
        search_type,
        videos (
          id,
          title,
          channel_name,
          thumbnail_url,
          views,
          published_at,
          duration_sec
        ),
        channels (
          id,
          name,
          subscriber_count,
          total_views
        ),
        niches (
          id,
          name
        ),
        niches!analysis_results_subniche_id_fkey (
          id,
          name
        )
      `)
      .eq('session_id', id)
      .order('opportunity_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (resultsError) {
      return NextResponse.json(
        { error: resultsError.message },
        { status: 500 }
      );
    }

    const { count } = await supabase
      .from('analysis_results')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', id);

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        searchType: session.search_type,
        keywords: session.keywords,
        createdAt: session.created_at,
      },
      results: results || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Results error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}