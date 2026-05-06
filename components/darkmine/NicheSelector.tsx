'use client';

import { useState, useEffect } from 'react';

interface Niche {
  id: number;
  name: string;
  parent_id: number | null;
  cpm_tier: number;
  is_entertainment: boolean;
  keywords: string[];
  children: Niche[];
}

interface NicheSelectorProps {
  selectedNicheId: number | null;
  selectedSubnicheId: number | null;
  onNicheSelect: (nicheId: number | null, subnicheId: number | null, keywords: string[]) => void;
}

const NICHE_ICONS: Record<string, string> = {
  'Finanças': '💰',
  'Investimentos': '📈',
  'Criptomoedas': '₿',
  'True Crime': '🕵️',
  'Tech': '🤖',
  'IA & Machine Learning': '🧠',
  'História': '📜',
  'Psicologia': '🧠',
  'Geopolítica': '🌍',
  'Estoicismo': '🏛️',
  'Espaço/Ciência': '🚀',
  'Entretenimento': '🎬',
};

const NICHE_COLORS: Record<string, string> = {
  money: 'bg-emerald-900/60 border-emerald-500/50 text-emerald-300',
  entertainment: 'bg-purple-900/60 border-purple-500/50 text-purple-300',
  risk: 'bg-yellow-900/60 border-yellow-500/50 text-yellow-300',
  special: 'bg-blue-900/60 border-blue-500/50 text-blue-300',
  default: 'bg-gray-800/60 border-gray-600/50 text-gray-300',
};

function getNicheCategory(niche: Niche): string {
  if (niche.is_entertainment) return 'entertainment';
  if (niche.name === 'Geopolítica' || niche.name === 'História') return 'risk';
  if (niche.cpm_tier >= 3 && !niche.is_entertainment) return 'money';
  return 'default';
}

export function NicheSelector({ selectedNicheId, selectedSubnicheId, onNicheSelect }: NicheSelectorProps) {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [subniches, setSubniches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipNiche, setTooltipNiche] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/darkmine/niches')
      .then(res => res.json())
      .then(data => {
        setNiches(data.niches || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedNicheId) {
      fetch(`/api/darkmine/niches?parent_id=${selectedNicheId}`)
        .then(res => res.json())
        .then(data => {
          setSubniches(data.niches || []);
        })
        .catch(() => setSubniches([]));
    } else {
      setSubniches([]);
    }
  }, [selectedNicheId]);

  const handleNicheClick = (niche: Niche | null) => {
    if (niche === null) {
      onNicheSelect(null, null, []);
    } else {
      const keywords = niche.keywords || [];
      onNicheSelect(niche.id, null, keywords);
    }
  };

  const handleSubnicheClick = (subniche: Niche) => {
    const keywords = subniche.keywords || [];
    const parentNiche = niches.find(n => n.id === selectedNicheId);
    const parentKeywords = parentNiche?.keywords || [];
    onNicheSelect(selectedNicheId, subniche.id, [...parentKeywords, ...keywords]);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 flex-wrap animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 rounded-full bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-600 font-mono uppercase tracking-wider mr-1">Nicho:</span>
        
        <button
          onClick={() => handleNicheClick(null)}
          className={`tag-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            selectedNicheId === null ? 'active bg-gray-700 border-purple-500/50 text-purple-300' : 'border-white/10 text-gray-400 hover:border-purple-500/40'
          }`}
        >
          Todos
        </button>

        {niches.map(niche => {
          const category = getNicheCategory(niche);
          const colorClass = NICHE_COLORS[category];
          const isSelected = selectedNicheId === niche.id;
          
          return (
            <div key={niche.id} className="relative">
              <button
                onClick={() => handleNicheClick(niche)}
                onMouseEnter={() => niche.name === 'Geopolítica' && setTooltipNiche(niche.id)}
                onMouseLeave={() => setTooltipNiche(null)}
                className={`tag-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  isSelected ? colorClass : 'border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                <span>{NICHE_ICONS[niche.name] || '📂'}</span>
                <span>{niche.name}</span>
              </button>
              
              {tooltipNiche === niche.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-yellow-900/90 border border-yellow-500/50 text-yellow-200 text-xs whitespace-nowrap z-50 shadow-lg">
                  ⚠️ Este nicho exige validação manual antes de publicar
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={() => {}}
          className="tag-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all border-white/10 text-gray-400 hover:border-blue-500/40 flex items-center gap-1.5"
          title="Filtrar apenas vídeos com IA declarada"
        >
          <span>🤖</span>
          <span>Apenas IA</span>
        </button>
      </div>

      {subniches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pl-16">
          <span className="text-xs text-gray-500 font-mono">Subnichos:</span>
          {subniches.map(subniche => {
            const isSubSelected = selectedSubnicheId === subniche.id;
            const parentNiche = niches.find(n => n.id === selectedNicheId);
            const parentCategory = parentNiche ? getNicheCategory(parentNiche) : 'default';
            const colorClass = NICHE_COLORS[parentCategory];
            
            return (
              <button
                key={subniche.id}
                onClick={() => handleSubnicheClick(subniche)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                  isSubSelected 
                    ? colorClass 
                    : 'border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/20'
                }`}
                title={`${parentNiche?.name} > ${subniche.name}`}
                >
                {subniche.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}