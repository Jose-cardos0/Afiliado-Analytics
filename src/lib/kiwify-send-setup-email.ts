import * as SibApiV3Sdk from "@getbrevo/brevo";

/** E-mail de primeiro acesso (Brevo) — webhooks Kiwify. */
export async function sendKiwifySetupEmail(toEmail: string, toName: string, resetUrl: string) {
  const api = new SibApiV3Sdk.TransactionalEmailsApi();
  api.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);
  const msg = new SibApiV3Sdk.SendSmtpEmail();
  msg.sender = { name: "Afiliado Analytics", email: "nao-responda@afiliadoanalytics.com.br" };
  msg.to = [{ email: toEmail, name: toName }];
  msg.subject = "Bem-vindo(a) ao Afiliado Analytics";
  msg.htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Definir minha senha</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border:1px solid #e0e0e0; border-radius:4px;">
          <tr>
            <td align="center" style="padding:40px 0 30px 0;">
              <div style="font-size:36px; line-height:1.2; font-weight:bold; letter-spacing:-1px; font-family:Arial, Helvetica, sans-serif;">
                <span style="color:#222222;">Afiliado </span><span style="color:#EE4D2D;">Analytics</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 20px 40px; text-align:center;">
              <h1 style="font-size:24px; color:#222222; margin:0 0 10px 0; font-weight:bold;">Bem‑vindo(a), ${toName}!</h1>
              <p style="font-size:16px; color:#555555; line-height:1.6; margin:0;">
                Sua assinatura está ativa e sua conta já foi criada com sucesso. Para começar, defina sua senha abaixo e acesse o painel.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 40px;">
              <a href="${resetUrl}" target="_blank"
                 style="background-color:#EE4D2D; color:#ffffff; padding:15px 30px; text-decoration:none; border-radius:3px; font-weight:bold; font-size:16px; display:inline-block; border-bottom:3px solid #D03F1E;">
                Definir minha senha
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 10px 40px; text-align:center;">
              <p style="font-size:14px; color:#666666; margin:0;">
                Depois de definir a senha, o acesso ao painel será imediato para acompanhar métricas.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 40px 30px 40px; text-align:center;">
              <p style="font-size:14px; color:#666666; margin:0 0 8px 0;">
                Se o botão não funcionar, clique no link abaixo:
              </p>
              <p style="font-size:12px; color:#3366cc; word-break:break-all; margin:0;">
                <a href="${resetUrl}" target="_blank" style="color:#3366cc; text-decoration:underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #eeeeee; height:1px; line-height:1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 30px 40px; text-align:center; font-size:14px; color:#888888;">
              <p style="margin:0 0 10px 0;">Este link expira em 24 horas por segurança. Caso não tenha solicitado a criação desta conta, ignore este e‑mail.</p>
              <p style="margin:0;">Dúvidas? <a href="mailto:suporte@afiliadoanalytics.com.br" target="_blank" style="color:#EE4D2D; text-decoration:none;">suporte@afiliadoanalytics.com.br</a></p>
            </td>
          </tr>
        </table>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; margin-top:20px;">
          <tr>
            <td align="center" style="font-size:12px; color:#999999;">
              <p style="margin:0;">&copy; 2025 Afiliado Analytics. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  await api.sendTransacEmail(msg);
}
