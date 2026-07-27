import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Assina o `state` do OAuth com o channelId para impedir que alguém force a troca de um
 * `code` próprio contra o `state` (channelId) de outra pessoa — sem isso, o callback confiava
 * cegamente no valor de state vindo da URL.
 */
function hmacKey(): string {
  const key = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!key) throw new Error('GOOGLE_OAUTH_CLIENT_SECRET não configurado.');
  return key;
}

export function signState(channelId: string): string {
  const sig = createHmac('sha256', hmacKey()).update(channelId).digest('hex');
  return `${channelId}.${sig}`;
}

export function verifyState(state: string): string | null {
  const idx = state.lastIndexOf('.');
  if (idx === -1) return null;
  const channelId = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = createHmac('sha256', hmacKey()).update(channelId).digest('hex');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  return channelId;
}
