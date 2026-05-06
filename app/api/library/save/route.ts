import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const SaveItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  title_en: z.string().optional(),
  language: z.string().default('en'),
  source: z.enum(['darkmine', 'darkhook', 'manual']),
  source_id: z.string().optional(),
  source_session_id: z.string().optional(),
  vpd: z.number().optional(),
  anomaly_ratio: z.number().optional(),
  dark_score: z.number().optional(),
  opportunity_score: z.number().optional(),
  niche_id: z.number().optional(),
  subniche_id: z.number().optional(),
  niche_label: z.string().optional(),
  audience_profile_id: z.string().uuid().optional(),
  persona_name: z.string().optional(),
  archetype: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const parsed = SaveItemSchema.parse(body);

    if (parsed.source_id) {
      const { data: existing } = await supabase
        .from('library_items')
        .select('*')
        .eq('source_id', parsed.source_id)
        .single();

      if (existing) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          item: existing,
        });
      }
    }

    const { data: item, error } = await supabase
      .from('library_items')
      .insert({
        title: parsed.title,
        title_en: parsed.title_en,
        language: parsed.language,
        source: parsed.source,
        source_id: parsed.source_id,
        source_session_id: parsed.source_session_id,
        vpd: parsed.vpd,
        anomaly_ratio: parsed.anomaly_ratio,
        dark_score: parsed.dark_score,
        opportunity_score: parsed.opportunity_score,
        niche_id: parsed.niche_id,
        subniche_id: parsed.subniche_id,
        niche_label: parsed.niche_label,
        audience_profile_id: parsed.audience_profile_id,
        persona_name: parsed.persona_name,
        archetype: parsed.archetype,
        tags: parsed.tags,
        notes: parsed.notes,
        status: 'raw',
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item,
    }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}