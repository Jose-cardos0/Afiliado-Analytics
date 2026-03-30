/**
 * Geração de short link Shopee afiliado no servidor (sem sessão do browser).
 */

import crypto from "crypto";

const SHOPEE_GQL = "https://open-api.affiliate.shopee.com.br/graphql";

export function buildShopeeAuthorizationHeader(appId: string, secret: string, payload: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureRaw = `${appId}${timestamp}${payload}${secret}`;
  const signature = crypto.createHash("sha256").update(signatureRaw).digest("hex");
  return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;
}

export async function shopeeGenerateShortLink(
  appId: string,
  secret: string,
  originUrl: string,
  subIds: string[]
): Promise<{ shortLink: string } | { error: string }> {
  const subIdsJson = JSON.stringify(subIds);
  const mutation = `
    mutation {
      generateShortLink(input: {
        originUrl: ${JSON.stringify(originUrl)}
        subIds: ${subIdsJson}
      }) {
        shortLink
      }
    }
  `;
  const payload = JSON.stringify({ query: mutation });
  const Authorization = buildShopeeAuthorizationHeader(appId, secret, payload);
  const res = await fetch(SHOPEE_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization },
    body: payload,
  });
  const json = (await res.json()) as {
    data?: { generateShortLink?: { shortLink?: string } };
    errors?: { message?: string }[];
  };
  if (!res.ok || json.errors?.length) {
    return { error: json.errors?.[0]?.message ?? `Shopee HTTP ${res.status}` };
  }
  const shortLink = json.data?.generateShortLink?.shortLink ?? "";
  if (!shortLink) return { error: "Resposta Shopee sem shortLink" };
  return { shortLink };
}
