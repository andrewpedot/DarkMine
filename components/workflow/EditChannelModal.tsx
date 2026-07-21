'use client';

import { useState } from 'react';
import { updateChannel, deleteChannel } from '@/app/actions/channels';
import { RECURRENCE_LABELS, WEEKDAY_LABELS } from '@/lib/recurrence';
import type { Channel, ChannelStatus, ChannelTipo, RecurrenceType } from '@/types/database';

const TIPOS: { value: ChannelTipo; label: string }[] = [
  { value: 'financas', label: 'Finanças' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'outro', label: 'Outro' },
];

const RECURRENCES: RecurrenceType[] = ['diario', 'seg_sex', 'dia_sim_dia_nao', 'custom'];

const STATUSES: { value: ChannelStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'arquivado', label: 'Arquivado' },
];

interface Props {
  channel: Channel;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EditChannelModal({ channel, onClose, onSaved, onDeleted }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [channelCode, setChannelCode] = useState(channel.channel_code ?? '');
  const [name, setName] = useState(channel.name);
  const [youtubeUrl, setYoutubeUrl] = useState(channel.youtube_url ?? '');
  const [tipo, setTipo] = useState<ChannelTipo>(channel.tipo ?? 'storytelling');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(channel.recurrence_type ?? 'dia_sim_dia_nao');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(channel.recurrence_days ?? []);
  const [startDate, setStartDate] = useState(channel.publish_start_date ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ChannelStatus>(channel.status);

  function toggleDay(day: number) {
    setRecurrenceDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  async function handleSave() {
    if (!name.trim()) return setError('Dê um nome ao canal.');
    if (recurrenceType === 'custom' && recurrenceDays.length === 0) {
      return setError('Selecione ao menos um dia da semana.');
    }
    setError('');
    setSaving(true);
    try {
      await updateChannel(channel.id, {
        channel_code: channelCode.trim(),
        name: name.trim(),
        youtube_url: youtubeUrl.trim(),
        tipo,
        recurrence_type: recurrenceType,
        recurrence_days: recurrenceDays,
        publish_start_date: startDate,
        status,
      });
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar canal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError('');
    try {
      await deleteChannel(channel.id);
      onDeleted();
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir canal.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">Editar canal</h2>
            <p className="text-xs text-gray-500 mt-0.5">{channel.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto flex flex-col gap-4">
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
              className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
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
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    status === s.value
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="pt-2 border-t border-white/5">
            {confirmingDelete ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3.5 py-2.5">
                <span className="text-xs text-red-300">Excluir "{channel.name}" e todo o cronograma dele?</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setConfirmingDelete(false)} className="text-xs text-gray-400 hover:text-gray-200">
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg px-3 py-1.5"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                Excluir canal
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
