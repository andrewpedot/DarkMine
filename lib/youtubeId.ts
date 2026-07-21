const URL_PATTERNS = [
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
];

/** Aceita uma URL do YouTube ou um ID já extraído e retorna o ID de 11 caracteres. */
export function extractYouTubeId(input: string): string {
  const trimmed = input.trim();
  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return trimmed;
}
