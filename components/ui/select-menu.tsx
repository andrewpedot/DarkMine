'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Option {
  value: string;
  label: string;
  dotColor?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

export function SelectMenu({ value, onChange, options, className }: Props) {
  const selected = options.find((o) => o.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`rounded-xl bg-white/5 border border-white/10 hover:border-white/20 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors flex items-center gap-2 ${className ?? ''}`}
        >
          {selected?.dotColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.dotColor }} />}
          <span className="truncate">{selected?.label ?? 'Selecionar'}</span>
          <svg className="w-3.5 h-3.5 text-gray-500 shrink-0 ml-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={() => onChange(o.value)}
            className={o.value === value ? 'bg-indigo-500/15 text-indigo-300' : 'text-gray-300'}
          >
            {o.dotColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.dotColor }} />}
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
