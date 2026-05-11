export type ChannelStatus = 'ativo' | 'pausado' | 'arquivado'

export interface Channel {
  id: string
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
  created_at: string
  updated_at: string
  characters?: ChannelCharacter[]
}

export interface ChannelCharacter {
  id: string
  channel_id: string
  name: string
  image_url?: string
  created_at: string
  updated_at: string
}
