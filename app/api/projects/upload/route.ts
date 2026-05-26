import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import pdfParse from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse the PDF directly from the memory buffer!
    const pdfData = await pdfParse(buffer);
    const textContent = pdfData.text || '';

    console.log(`PDF parsed in memory: ${file.name} (${textContent.length} chars)`);

    return NextResponse.json({ 
      success: true, 
      filename: file.name,
      text: textContent
    });
  } catch (error: any) {
    console.error('Erro no upload e parse de PDF:', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao processar PDF' }, { status: 500 });
  }
}
