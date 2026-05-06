import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }
    
    const { data: niches, error } = await supabase
      .from('niches')
      .select('id, name, parent_id, cpm_tier, is_entertainment, keywords')
      .order('name');

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const nicheMap = new Map<number, any>();
    const rootNiches: any[] = [];

    for (const niche of niches || []) {
      nicheMap.set(niche.id, { ...niche, children: [] });
    }

    for (const niche of niches || []) {
      if (niche.parent_id) {
        const parent = nicheMap.get(niche.parent_id);
        if (parent) {
          parent.children.push(nicheMap.get(niche.id));
        }
      } else {
        rootNiches.push(nicheMap.get(niche.id));
      }
    }

    return NextResponse.json({ niches: rootNiches });
  } catch (error: any) {
    console.error('Niches error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}