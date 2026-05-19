import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface ClipRequest {
  youtubeId: string;
  startTime: number;
  endTime: number;
  quality?: 'best' | '720' | '480';
}

async function checkYtDlp(): Promise<boolean> {
  try {
    await execAsync('yt-dlp --version');
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ClipRequest = await req.json();
    const { youtubeId, startTime, endTime, quality = '720' } = body;

    if (!youtubeId) {
      return NextResponse.json({ error: 'youtubeId é obrigatório' }, { status: 400 });
    }
    if (typeof startTime !== 'number' || typeof endTime !== 'number') {
      return NextResponse.json({ error: 'startTime e endTime são obrigatórios' }, { status: 400 });
    }
    if (endTime - startTime > 60) {
      return NextResponse.json({ error: 'Máximo de 60 segundos por clipe' }, { status: 400 });
    }
    if (endTime <= startTime) {
      return NextResponse.json({ error: 'endTime deve ser maior que startTime' }, { status: 400 });
    }

    const hasYtDlp = await checkYtDlp();
    if (!hasYtDlp) {
      return NextResponse.json(
        { error: 'yt-dlp não instalado. Execute: pip install yt-dlp' },
        { status: 500 }
      );
    }

    const formatArg =
      quality === 'best'
        ? 'bestvideo+bestaudio/best'
        : `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;

    const outFile = path.join(os.tmpdir(), `clip_${youtubeId}_${startTime}_${endTime}.mp4`);
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;

    const cmd = [
      'yt-dlp',
      `"${url}"`,
      `--download-sections "*${startTime}-${endTime}"`,
      `-f "${formatArg}"`,
      '--merge-output-format mp4',
      `--force-keyframes-at-cuts`,
      `-o "${outFile}"`,
    ].join(' ');

    await Promise.race([
      execAsync(cmd),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: clipping demorou mais de 60 segundos')), 60000)
      ),
    ]);

    if (!fs.existsSync(outFile)) {
      return NextResponse.json({ error: 'Falha ao gerar clipe' }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(outFile);
    fs.unlinkSync(outFile);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="clip_${youtubeId}_${startTime}-${endTime}.mp4"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (err: any) {
    console.error('[media/clip]', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao processar clipe' },
      { status: 500 }
    );
  }
}
