import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchVideos, getVideoDetails, getChannelDetails, getCommentThreads, saveVideoToDb, saveChannelToDb, YouTubeVideo, YouTubeChannel } from '@/lib/youtube';
import { computeFacelessScore, computeCommentGoldScore, classifyNiche, computeTimingBonus, computeMonetizationSignals, computeFinalScore, calculateOutlierMultiplier, calculateViewsPerDay, determineSearchType } from '@/lib/scoring';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { sessionName, keywords, searchType, maxSubscribers = 50000 } = body;

    if (!sessionName || !keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: 'sessionName and keywords are required' },
        { status: 400 }
      );
    }

    const type = determineSearchType(keywords);

    const { data: session, error: sessionError } = await supabase
      .from('search_sessions')
      .insert({
        name: sessionName,
        keywords,
        search_type: searchType || type,
        max_subscribers: maxSubscribers,
        status: 'processing',
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      );
    }

    const queryStr = keywords.join(' ');
    
    // Fetch niches for classification
    const { data: dbNiches } = await supabase.from('niches').select('id, name, parent_id, keywords');
    
    try {
      const { videos: searchResults, quotaCost: searchCost } = await searchVideos(queryStr, 100);
      
      if (searchResults.length === 0) {
        await supabase
          .from('search_sessions')
          .update({ status: 'completed' })
          .eq('id', session.id);

        return NextResponse.json({
          sessionId: session.id,
          status: 'completed',
          resultsCount: 0,
        });
      }

      const videoIds = searchResults.map(v => v.id);
      const channelIds = [...new Set(searchResults.map(v => v.channelId))];

      const { videos: videoDetails, quotaCost: videoCost } = await getVideoDetails(videoIds);
      const { channels: channelDetails, quotaCost: channelCost } = await getChannelDetails(channelIds);

      const channelMap = new Map<string, YouTubeChannel>();
      for (const ch of channelDetails) {
        channelMap.set(ch.id, ch);
        await saveChannelToDb(ch);
      }

      const videosMap = new Map<string, YouTubeVideo>();
      for (const vid of videoDetails) {
        videosMap.set(vid.id, vid);
      }

      const results = [];

      for (const video of videoDetails) {
        const channel = channelMap.get(video.channelId);
        if (!channel) continue;

        if (channel.subscriberCount > maxSubscribers) continue;

        const outlierMultiplier = calculateOutlierMultiplier(video.views, channel.subscriberCount);
        if (outlierMultiplier < 1) continue;

        const viewsPerDay = calculateViewsPerDay(video.views, video.publishedAt);
        if (viewsPerDay < 200) continue;

        const facelessScore = computeFacelessScore(channel, videoDetails);
        const { nicheId, subnicheId, confidence } = classifyNiche(
          video.title,
          video.description,
          video.tags,
          dbNiches || []
        );
        const timingBonus = computeTimingBonus(channel);
        const monetizationSignals = computeMonetizationSignals(channel.description);

        await saveVideoToDb(video, channel.id);

        const { comments } = await getCommentThreads(video.id, 20).catch(() => ({ comments: [], quotaCost: 0 }));
        const commentGoldScore = computeCommentGoldScore(comments);

        const { score: finalScore, breakdown } = computeFinalScore(
          {
            facelessScore,
            commentGoldScore,
            timingBonus,
            monetizationSignals,
            outlierMultiplier,
          },
          type
        );

        const { data: analysisResult, error: analysisError } = await supabase
          .from('analysis_results')
          .insert({
            session_id: session.id,
            video_id: video.id,
            channel_id: channel.id,
            niche_id: nicheId,
            subniche_id: subnicheId,
            faceless_score: facelessScore,
            comment_gold_score: commentGoldScore,
            opportunity_score: finalScore,
            score_breakdown: breakdown,
            search_type: type,
            outlier_multiplier: outlierMultiplier,
            views_per_day: viewsPerDay,
          })
          .select()
          .single();

        if (!analysisError && analysisResult) {
          results.push(analysisResult);
        }
      }

      await supabase
        .from('search_sessions')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', session.id);

      return NextResponse.json({
        sessionId: session.id,
        status: 'completed',
        resultsCount: results.length,
        costs: { search: searchCost, video: videoCost, channel: channelCost },
      });
    } catch (apiError: any) {
      await supabase
        .from('search_sessions')
        .update({ status: 'failed' })
        .eq('id', session.id);

      return NextResponse.json(
        { error: apiError.message || 'API call failed' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}