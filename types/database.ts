export type ChannelStatus = 'ativo' | 'pausado' | 'arquivado'
export type ChannelTipo = 'financas' | 'storytelling' | 'outro'
export type RecurrenceType = 'diario' | 'seg_sex' | 'dia_sim_dia_nao' | 'custom'
export type VideoPipelineStatus = 'em_producao' | 'pronto' | 'publicado'

export interface Channel {
  id: string
  channel_code?: string
  name: string
  niche: string
  sub_niche?: string
  persona?: string
  video_format?: string
  language: string
  status: ChannelStatus
  ref_titles?: string[]
  ref_transcripts?: { title: string; transcript: string }[]
  ref_scripts?: { title: string; script: string }[]
  youtube_url?: string
  tipo?: ChannelTipo
  recurrence_type?: RecurrenceType
  recurrence_days?: number[]
  publish_start_date?: string
  color?: string
  created_at: string
  updated_at: string
  characters?: ChannelCharacter[]
}

export interface ScheduledVideo {
  id: string
  channel_id: string
  sequence_number: number
  title: string
  scheduled_date: string
  status: VideoPipelineStatus
  youtube_video_id?: string
  published_at?: string
  created_at: string
  updated_at: string
}

export interface VideoMetric {
  id: string
  scheduled_video_id: string
  synced_at: string
  days_since_published?: number
  views?: number
  ctr?: number
  watch_time_minutes?: number
  avg_view_duration_sec?: number
  likes?: number
  comments?: number
  impressions?: number
}

export interface ChannelCharacter {
  id: string
  channel_id: string
  name: string
  image_url?: string
  created_at: string
  updated_at: string
}
