import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { url, filename, destDir } = await req.json();
    if (!url || !filename || !destDir) {
      return NextResponse.json({ error: 'url, filename e destDir são obrigatórios' }, { status: 400 });
    }

    // Garante que o diretório existe
    fs.mkdirSync(destDir, { recursive: true });

    const filePath = path.join(destDir, filename);

    // Baixa o arquivo externamente (server-side, sem CORS)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status} ao buscar ${url}` }, { status: 502 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ ok: true, path: filePath, size: buffer.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
