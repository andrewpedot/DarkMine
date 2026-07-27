import { schedule } from '@netlify/functions';

// Mantém a função Next.js (que serve /api/mcp) aquecida — sem isso, a primeira chamada
// depois de um período ocioso leva ~3-5s de cold start, o que estoura o timeout de alguns
// clientes MCP (ex.: Cowork), fazendo a primeira tentativa de cada sessão falhar.
export const handler = schedule('*/10 * * * *', async () => {
  try {
    await fetch('https://darkmine.fun/api/mcp', { method: 'GET' });
  } catch {
    // best-effort — se falhar, o próximo agendamento tenta de novo
  }
  return { statusCode: 200, body: '' };
});
