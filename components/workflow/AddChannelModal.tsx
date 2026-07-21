'use client';

import { useState } from 'react';
import { createChannel } from '@/app/actions/channels';
import { createScheduledVideos } from '@/app/actions/schedule';
import { computeScheduleDates, RECURRENCE_LABELS, WEEKDAY_LABELS } from '@/lib/recurrence';
import type { ChannelTipo, RecurrenceType } from '@/types/database';

const TIPOS: { value: ChannelTipo; label: string }[] = [
  { value: 'financas', label: 'Finanças' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'outro', label: 'Outro' },
];

const RECURRENCES: RecurrenceType[] = ['diario', 'seg_sex', 'dia_sim_dia_nao', 'custom'];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function AddChannelModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [channelCode, setChannelCode] = useState('');
  const [name, setName] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tipo, setTipo] = useState<ChannelTipo>('storytelling');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('dia_sim_dia_nao');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [titlesRaw, setTitlesRaw] = useState('');
  const [createdChannelId, setCreatedChannelId] = useState<string | null>(null);

  const titles = titlesRaw.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 10);
  const previewDates = computeScheduleDates(startDate, recurrenceType, recurrenceDays, 10);

  function toggleDay(day: number) {
    setRecurrenceDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  async function handleCreateChannel() {
    if (!name.trim()) return setError('Dê um nome ao canal.');
    if (recurrenceType === 'custom' && recurrenceDays.length === 0) {
      return setError('Selecione ao menos um dia da semana.');
    }
    setError('');
    setSaving(true);
    try {
      const channel = await createChannel({
        channel_code: channelCode.trim(),
        name: name.trim(),
        youtube_url: youtubeUrl.trim(),
        tipo,
        recurrence_type: recurrenceType,
        recurrence_days: recurrenceDays,
        publish_start_date: startDate,
      });
      setCreatedChannelId(channel.id);
      setStep(2);
    } catch (e: any) {
      setError(e.message || 'Erro ao criar canal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSchedule() {
    if (!createdChannelId) return;
    if (titles.length === 0) return setError('Cole ao menos 1 título.');
    setError('');
    setSaving(true);
    try {
      const entries = titles.map((title, i) => ({ title, date: previewDates[i] }));
      await createScheduledVideos(createdChannelId, entries);
      onCreated();
    } catch (e: any) {
      setError(e.message || 'Erro ao criar cronograma.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">
              {step === 1 ? 'Adicionar canal' : 'Primeiros 10 vídeos'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1 ? 'Passo 1 de 2 — dados do canal' : 'Passo 2 de 2 — cronograma inicial'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ID do canal</label>
                <input
                  value={channelCode}
                  onChange={(e) => setChannelCode(e.target.value)}
                  placeholder="Ex: SD01"
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome do canal</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sombras do Dinheiro"
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">URL do YouTube</label>
                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@canal"
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTipo(t.value)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        tipo === t.value
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                          : 'border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Padrão de publicação</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {RECURRENCES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRecurrenceType(r)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium text-left transition-colors ${
                        recurrenceType === r
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                          : 'border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {RECURRENCE_LABELS[r]}
                    </button>
                  ))}
                </div>
                {recurrenceType === 'custom' && (
                  <div className="mt-2 flex gap-1.5">
                    {WEEKDAY_LABELS.map((label, day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${
                          recurrenceDays.includes(day)
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white/5 text-gray-500 hover:bg-white/10'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Início das publicações</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 [color-scheme:dark]"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Cole os 10 títulos (um por linha)
                </label>
                <textarea
                  value={titlesRaw}
                  onChange={(e) => setTitlesRaw(e.target.value)}
                  rows={8}
                  placeholder={'Título do vídeo 1\nTítulo do vídeo 2\n...'}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 font-mono"
                />
              </div>

              {titles.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prévia do cronograma</p>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {titles.map((title, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600 w-14 shrink-0">Vídeo {i + 1}</span>
                        <span className="text-gray-500 w-24 shrink-0 font-mono">{previewDates[i]}</span>
                        <span className="text-gray-300 truncate">{title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-200">
              Voltar
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={step === 1 ? handleCreateChannel : handleCreateSchedule}
            disabled={saving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            {saving ? 'Salvando...' : step === 1 ? 'Continuar' : 'Criar cronograma'}
          </button>
        </div>
      </div>
    </div>
  );
}
