'use server';

import { supabase } from '@/lib/supabase';

export interface Project {
  id: string;
  created_at: string;
  title_original: string;
  title_final: string | null;
  market: string | null;
  status: string | null;
  script_content: any | null;
  thumb_prompts: any | null;
}

export async function createProject(titleOriginal: string, market: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      title_original: titleOriginal,
      market: market,
      status: 'hook',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(id: string, updates: Partial<Project>) {
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getProject(id: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAllProjects() {
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteProject(id: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}