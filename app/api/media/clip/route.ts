import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Roda yt-dlp via spawn com stdin fechado (previne hang do Deno solver em contexto Node.js)
// Retorna { promise, kill } — kill() encerra o processo imediatamente (evita zumbis no timeout)
function spawnYtDlp(exe: string, args: string[]): { promise: Promise<void>; kill: () => void } {
  let proc: ReturnType<typeof spawn>;

  const promise = new Promise<void>((resolve, reject) => {
    proc = spawn(exe, args, {
      stdio: ['ignore', 'pipe', 'pipe'], // stdin fechado — evita bloqueio aguardando input
      windowsHide: true,
      env: { ...process.env, DENO_NO_UPDATE_CHECK: '1', PYTHONUTF8: '1' },
    });

    let stderr = '';
    proc.stdout?.resume(); // drena stdout para evitar bloqueio do pipe
    proc.stderr?.on('data', d => { stderr += d.toString(); });

    proc.on('error', reject);
    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        // Extrai mensagem de erro do stderr
        const errLine = stderr.split('\n').filter(l => l.includes('ERROR')).pop()
          || stderr.slice(-300);
        reject(new Error(errLine.replace(/^\s*ERROR:\s*/i, '').trim() || `yt-dlp saiu com código ${code}`));
      }
    });
  });

  return { promise, kill: () => { try { proc?.kill('SIGKILL'); } catch {} } };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Token',
};

const EXT_TOKEN = 'darkclip-local';

const WINGET_BASE  = 'C:\\Users\\André\\AppData\\Local\\Microsoft\\WinGet\\Packages';
const FFMPEG_BIN   = `${WINGET_BASE}\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin`;
const DENO_BIN     = `${WINGET_BASE}\\DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe`;
const DENO_EXE     = `${DENO_BIN}\\deno.exe`;
const YTDLP_EXE    = 'C:\\Users\\André\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\yt-dlp.exe';

// Arquivo de cookies exportado do Chrome (formato Netscape).
// Exportar em: chrome://extensions → "Get cookies.txt LOCALLY" → youtube.com → Export
// Salvar em: C:\Users\André\.yt-dlp-cookies.txt
const COOKIES_FILE = 'C:\\Users\\André\\.yt-dlp-cookies.txt';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function errResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}

function validate(youtubeId: string, startTime: number, endTime: number) {
  if (!youtubeId)                                   return 'youtubeId é obrigatório';
  if (isNaN(startTime) || isNaN(endTime))           return 'startTime e endTime inválidos';
  if (endTime <= startTime)                         return 'endTime deve ser maior que startTime';
  if (endTime - startTime > 60)                     return 'Máximo de 60 segundos por clipe';
  return null;
}

async function runYtDlp(youtubeId: string, startTime: number, endTime: number, quality = '1080') {
  // Verifica se yt-dlp está disponível
  if (!fs.existsSync(YTDLP_EXE)) throw new Error(`yt-dlp não encontrado em: ${YTDLP_EXE}`);

  // SOLUÇÃO DEFINITIVA CONTRA RATE LIMITING DO YOUTUBE:
  // HLS (m3u8) format 96 = 1920x1080 H.264 → 6 MB/s, sem throttle
  // DASH streams (AV1/VP9/H264) são limitados a 9 KB/s pelo YouTube.
  // HLS/m3u8 NÃO é limitado — segmentos TS servidos pelo CDN de streaming.
  // tv_embedded → EJS resolve JS challenges → HLS streams disponíveis.
  const formatArg = quality === 'best'
    ? '96/95/94/bestvideo[protocol=m3u8_native]+bestaudio[protocol=m3u8_native]/18/best'
    : quality === '1080'
      ? '96/bestvideo[protocol=m3u8_native][height<=1080]+bestaudio[protocol=m3u8_native]/18/best'
      : quality === '720'
        ? '95/bestvideo[protocol=m3u8_native][height<=720]+bestaudio[protocol=m3u8_native]/18/best'
        : `bestvideo[protocol=m3u8_native][height<=${quality}]+bestaudio[protocol=m3u8_native]/18/best`;

  const clipId  = `${youtubeId}_${startTime}_${endTime}`;
  const outFile = path.join(os.tmpdir(), `darkclip_${clipId}.mp4`);

  if (fs.existsSync(outFile)) fs.unlinkSync(outFile);

  // Usa arquivo de cookies se existir; caso contrário, tenta ler do Chrome diretamente.
  // NOTA: --cookies-from-browser falha quando chamado de subprocesso Node.js (DPAPI restriction).
  // Solução recomendada: exportar cookies com extensão "Get cookies.txt LOCALLY" → salvar em COOKIES_FILE.
  const cookiesArgs: string[] = fs.existsSync(COOKIES_FILE)
    ? ['--cookies', COOKIES_FILE]
    : [];

  const args = [
    `https://www.youtube.com/watch?v=${youtubeId}`,
    '--download-sections', `*${startTime}-${endTime}`,
    '-f', formatArg,
    '--merge-output-format', 'mp4',
    '--concurrent-fragments', '8',
    '--extractor-args', 'youtube:player_client=tv_embedded',
    '--remote-components', 'ejs:github',
    ...cookiesArgs,
    '--ffmpeg-location', FFMPEG_BIN,
    '--js-runtimes', `deno:${DENO_EXE}`,
    '-o', outFile,
  ];

  console.log('[clip] Executando yt-dlp com args:', args.slice(0, 4));

  const { promise: ytDlpPromise, kill: killYtDlp } = spawnYtDlp(YTDLP_EXE, args);

  await Promise.race([
    ytDlpPromise,
    new Promise<never>((_, reject) =>
      setTimeout(() => {
        killYtDlp(); // mata o processo antes de rejeitar — evita processos zumbi
        reject(new Error('Timeout: yt-dlp demorou mais de 300s'));
      }, 300_000)
    ),
  ]);

  if (!fs.existsSync(outFile)) throw new Error('Falha ao gerar clipe (arquivo não criado)');

  return { outFile, clipId };
}

// ── GET ───────────────────────────────────────────────────────────────────────
// Dois modos:
//   1. ?clipId=xxx&_t=token  → serve o arquivo já preparado pelo POST
//   2. ?youtubeId=xxx&startTime=n&endTime=n&_t=token  → processa e serve direto
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  if (p.get('_t') !== EXT_TOKEN) return errResponse(401, 'Unauthorized');

  // Modo 1: serve arquivo já preparado
  const clipId = p.get('clipId');
  if (clipId) {
    const outFile = path.join(os.tmpdir(), `darkclip_${clipId}.mp4`);
    if (!fs.existsSync(outFile)) return errResponse(404, 'Clipe não encontrado ou expirado');

    const fileBuffer = fs.readFileSync(outFile);
    try { fs.unlinkSync(outFile); } catch {}

    const parts = clipId.split('_');
    const youtubeId = parts[0];
    const startTime = Number(parts[1]);
    const endTime   = Number(parts[2]);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="clip_${youtubeId}_${startTime}-${endTime}.mp4"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  }

  // Modo 2: processa e serve direto (para teste no browser)
  const youtubeId = p.get('youtubeId') ?? '';
  const startTime = Number(p.get('startTime'));
  const endTime   = Number(p.get('endTime'));
  const quality   = p.get('quality') ?? '720';

  const validErr = validate(youtubeId, startTime, endTime);
  if (validErr) return errResponse(400, validErr);

  try {
    const { outFile } = await runYtDlp(youtubeId, startTime, endTime, quality);
    const fileBuffer = fs.readFileSync(outFile);
    try { fs.unlinkSync(outFile); } catch {}

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="clip_${youtubeId}_${startTime}-${endTime}.mp4"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (err: any) {
    console.error('[clip GET]', err?.message);
    return errResponse(500, err?.message || 'Erro ao processar clipe');
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
// Para a extensão: processa o clipe, salva em temp e devolve a URL de download.
// background.js usa essa URL com chrome.downloads — sem problemas de blob/dataURL.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { youtubeId, startTime, endTime, quality = '1080' } = body;

    const validErr = validate(youtubeId, Number(startTime), Number(endTime));
    if (validErr) return errResponse(400, validErr);

    const { clipId } = await runYtDlp(youtubeId, Number(startTime), Number(endTime), quality);

    // Devolve a URL de download — o temp file já está pronto no servidor
    const downloadUrl = `http://localhost:3000/api/media/clip?clipId=${clipId}&_t=${EXT_TOKEN}`;

    return NextResponse.json(
      { ok: true, clipId, downloadUrl },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[clip POST]', err?.message);
    return errResponse(500, err?.message || 'Erro ao processar clipe');
  }
}
