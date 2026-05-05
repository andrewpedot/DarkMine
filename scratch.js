const fs = require('fs');
const path = 'c:/Users/André/OneDrive/Documentos/DarkMine/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /import \{ analyzeMarketKeywords \} from '\.\/actions\/analyze-market';/,
  "import { searchVideos } from './actions/search-videos';"
);

const videoCardStart = 'function VideoCard({ card }: { card: any }) {';
const exportDefaultStart = 'export default function DarkMinePage() {';
const vcStartIndex = content.indexOf(videoCardStart);
const edStartIndex = content.indexOf(exportDefaultStart);

const videoCardReplacement = `function VideoCard({ card }: { card: any }) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.round(num).toString();
  };

  return (
    <div className="rounded-2xl bg-gray-900 border border-purple-500/30 overflow-hidden flex flex-col shadow-lg shadow-purple-900/20">
      {/* Topo: Thumbnail */}
      <div className="relative w-full h-48 bg-gray-800">
        {card.thumbnailUrl && (
          <img src={card.thumbnailUrl} alt={card.title} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Corpo */}
      <div className="p-5 flex flex-col flex-1 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight mb-1" title={card.title}>
            {card.title}
          </h3>
          <p className="text-sm text-gray-400 font-medium">👤 {card.channel}</p>
        </div>

        {/* Badges de Dados */}
        <div className="flex flex-wrap gap-2">
          {/* Badge VPD */}
          <div className="bg-orange-950/40 border border-orange-500/50 text-orange-400 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
            🔥 VPD: {formatNumber(card.viewsPerDay || 0)} views/dia
          </div>
          {/* Badge IA Confirmada */}
          {card.syntheticMedia && (
            <div className="bg-green-950/40 border border-green-500/50 text-green-400 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
              🤖 IA Confirmada
            </div>
          )}
          {/* Badge Anomalia */}
          <div className="bg-blue-950/40 border border-blue-500/50 text-blue-400 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
            📈 Anomalia: {card.outlierMultiplier}x inscritos
          </div>
        </div>

        {/* Ações */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
          <a
            href={card.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Ver no YouTube
          </a>
          <button
            className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold flex items-center justify-center gap-2 border border-white/10 transition-colors"
            onClick={() => window.open(\`/hook?title=\${encodeURIComponent(card.title)}&market=Brasil\`, '_blank')}
          >
            📝 Extrair Roteiro
          </button>
        </div>
      </div>
    </div>
  );
}

`;

content = content.substring(0, vcStartIndex) + videoCardReplacement + content.substring(edStartIndex);

const handleMineStart = 'const handleMine = async () => {';
const handleMineEnd = '  return (\n    <div className="min-h-screen grid-bg relative overflow-x-hidden">';
const hmStartIndex = content.indexOf(handleMineStart);
const hmEndIndex = content.indexOf(handleMineEnd);

const handleMineReplacement = `const handleMine = async () => {
    if (!searchQuery && activeNiche === 'Todos') {
      setErrorMsg('Por favor, digite uma palavra-chave ou escolha um nicho específico.');
      return;
    }

    setMining(true);
    setMined(false);
    setErrorMsg('');

    try {
      const nicheMapping: Record<string, string> = {
        'Finanças': 'personal finance OR investing OR money',
        'True Crime': 'true crime OR unsolved mystery',
        'Tech': 'technology OR artificial intelligence',
        'História': 'history documentary OR historical facts',
        'Psicologia': 'psychology OR body language',
        'Geopolítica': 'geopolitics OR global economy',
        'Estoicismo': 'stoicism OR philosophy',
        'Espaço/Ciência': 'space documentary OR universe discovery',
        'Todos': 'viral documentary OR story time OR case study'
      };

      const q = searchQuery || nicheMapping[activeNiche] || activeNiche;
      const limitSubs = parseInt(maxSubs, 10) || 50000;

      const bestResults = await searchVideos(q, limitSubs, activeNiche);

      setCards(bestResults);
      setMined(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro desconhecido ao minerar dados');
    } finally {
      setMining(false);
    }
  };

`;

content = content.substring(0, hmStartIndex) + handleMineReplacement + content.substring(hmEndIndex);

fs.writeFileSync(path, content, 'utf8');
console.log('Success');
