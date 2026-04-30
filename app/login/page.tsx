'use client';

import { useActionState } from 'react';
import { login } from '../actions/auth';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="min-h-screen bg-[#080b12] flex items-center justify-center relative overflow-hidden text-gray-200">
      {/* Ambient glow blobs */}
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none" 
        style={{ 
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)', 
          filter: 'blur(60px)' 
        }} 
      />

      <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-violet-900 border border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.3)] mb-6">
            <svg className="w-7 h-7 text-violet-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">DarkMine</h1>
          <p className="text-sm font-mono text-violet-400/80 uppercase tracking-widest text-center">
            Acesso Restrito
          </p>
        </div>

        {/* Form Container */}
        <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
          <form action={formAction} className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase ml-1">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                placeholder="seu@email.com"
                required
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase ml-1">
                Senha
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
              />
            </div>

            {state?.error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-xs text-red-300 font-medium">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 h-12 w-full rounded-xl bg-violet-600 text-white text-sm font-bold transition-all hover:bg-violet-500 focus:ring-4 focus:ring-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Entrar no Laboratório'
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600 font-mono">
            SISTEMA DE INTELIGÊNCIA PRIVADO
          </p>
        </div>
      </div>
    </div>
  );
}
