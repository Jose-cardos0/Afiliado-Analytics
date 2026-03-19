/**
 * Teto por arquivo ao enviar `blob:` para o Blob via rota Next (antes do render).
 *
 * Mantemos ~4MB porque:
 * - A Vercel costuma limitar o **body da requisição** em ~4,5MB nas funções serverless;
 *   valores maiores no código não garantem que o upload chegue na função (pode dar 413).
 * - Menos RAM e tempo na função (um Buffer de 50MB por request pesa).
 *
 * Vídeos grandes: use mídia da Shopee (URL pública) ou, no futuro, upload direto
 * do browser para o Blob (sem passar pelo body da API).
 */
export const RENDER_PUBLISH_BLOB_MAX_BYTES = 4 * 1024 * 1024;
