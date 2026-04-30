import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';

export const metadata: Metadata = {
  title: 'DarkMine — Inteligência de Mercado para Criadores Dark YouTube',
  description: 'Descubra oportunidades ocultas no YouTube com inteligência de dados. Mineração de nichos dark, análise de outliers e arbitragem de conteúdo para criadores estratégicos.',
  keywords: 'youtube, dark channels, market intelligence, content creation, outlier analysis, nicho dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen" style={{ backgroundColor: '#080b12' }}>
        <Sidebar />
        <main className="pl-16">
          {children}
        </main>
      </body>
    </html>
  );
}
