import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type ProvedorBackupNuvem = 'google_drive' | 'onedrive';

type Credenciais = { accessToken: string; refreshToken: string; expiraEm?: string | null; email?: string | null; pastaId: string };

const PREFIXO = 'v1';

function chave() {
  const valor = process.env.BACKUP_NUVEM_ENCRYPTION_KEY || '';
  const buffer = Buffer.from(valor, 'base64');
  if (buffer.length !== 32) throw new Error('A chave de criptografia do backup em nuvem não está configurada corretamente.');
  return buffer;
}

export function cifrarBackupNuvem(valor: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', chave(), iv);
  const conteudo = Buffer.concat([cipher.update(valor, 'utf8'), cipher.final()]);
  return [PREFIXO, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), conteudo.toString('base64url')].join('.');
}

export function decifrarBackupNuvem(valor: string) {
  const [versao, ivTexto, tagTexto, conteudo] = String(valor || '').split('.');
  if (versao !== PREFIXO || !ivTexto || !tagTexto || !conteudo) throw new Error('A credencial do backup em nuvem é inválida. Reconecte a conta.');
  const decipher = createDecipheriv('aes-256-gcm', chave(), Buffer.from(ivTexto, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagTexto, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(conteudo, 'base64url')), decipher.final()]).toString('utf8');
}

export function configuracaoProvedor(provedor: ProvedorBackupNuvem) {
  const google = provedor === 'google_drive';
  const clientId = process.env[google ? 'GOOGLE_DRIVE_CLIENT_ID' : 'MICROSOFT_ONEDRIVE_CLIENT_ID'] || '';
  const clientSecret = process.env[google ? 'GOOGLE_DRIVE_CLIENT_SECRET' : 'MICROSOFT_ONEDRIVE_CLIENT_SECRET'] || '';
  if (!clientId || !clientSecret) throw new Error(`${google ? 'Google Drive' : 'OneDrive'} ainda não está configurado neste ambiente.`);
  return { clientId, clientSecret };
}

export function urlRetornoBackup(requestUrl: string, provedor: ProvedorBackupNuvem) {
  const origem = new URL(requestUrl).origin;
  return `${origem}/api/backup-nuvem/callback/${provedor === 'google_drive' ? 'google' : 'onedrive'}`;
}

export function urlAutorizacaoBackup(provedor: ProvedorBackupNuvem, requestUrl: string, estado: string) {
  const { clientId } = configuracaoProvedor(provedor);
  const retorno = urlRetornoBackup(requestUrl, provedor);
  const url = new URL(provedor === 'google_drive'
    ? 'https://accounts.google.com/o/oauth2/v2/auth'
    : 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', retorno);
  url.searchParams.set('state', estado);
  if (provedor === 'google_drive') {
    url.searchParams.set('scope', 'openid email https://www.googleapis.com/auth/drive.file');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
  } else {
    url.searchParams.set('scope', 'openid profile offline_access User.Read Files.ReadWrite.AppFolder');
  }
  return url.toString();
}

async function respostaJson(url: string, init: RequestInit) {
  const resposta = await fetch(url, init);
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(String(dados.error_description || dados.error?.message || dados.error || 'Não foi possível concluir a comunicação com a nuvem.'));
  return dados;
}

export async function trocarCodigoBackup(provedor: ProvedorBackupNuvem, codigo: string, requestUrl: string): Promise<Credenciais> {
  const { clientId, clientSecret } = configuracaoProvedor(provedor);
  const retorno = urlRetornoBackup(requestUrl, provedor);
  const corpo = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: codigo, redirect_uri: retorno, grant_type: 'authorization_code' });
  const dados = await respostaJson(
    provedor === 'google_drive' ? 'https://oauth2.googleapis.com/token' : 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo }
  );
  const accessToken = String(dados.access_token || '');
  const refreshToken = String(dados.refresh_token || '');
  if (!accessToken || !refreshToken) throw new Error('A nuvem não devolveu uma credencial de acesso permanente. Tente conectar novamente.');
  const perfil = await respostaJson(
    provedor === 'google_drive' ? 'https://www.googleapis.com/oauth2/v2/userinfo' : 'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const pastaId = provedor === 'google_drive' ? await garantirPastaGoogle(accessToken) : 'approot';
  return { accessToken, refreshToken, expiraEm: dados.expires_in ? new Date(Date.now() + Number(dados.expires_in) * 1000).toISOString() : null, email: String(perfil.email || perfil.mail || perfil.userPrincipalName || ''), pastaId };
}

export async function renovarTokenBackup(provedor: ProvedorBackupNuvem, refreshToken: string) {
  const { clientId, clientSecret } = configuracaoProvedor(provedor);
  const corpo = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' });
  const dados = await respostaJson(provedor === 'google_drive' ? 'https://oauth2.googleapis.com/token' : 'https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo });
  return { accessToken: String(dados.access_token || ''), refreshToken: String(dados.refresh_token || refreshToken), expiraEm: dados.expires_in ? new Date(Date.now() + Number(dados.expires_in) * 1000).toISOString() : null };
}

async function garantirPastaGoogle(accessToken: string) {
  const consulta = new URL('https://www.googleapis.com/drive/v3/files');
  consulta.searchParams.set('q', "name = 'AvantaLab Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  consulta.searchParams.set('spaces', 'drive'); consulta.searchParams.set('fields', 'files(id)');
  const lista = await respostaJson(consulta.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (lista.files?.[0]?.id) return String(lista.files[0].id);
  const criado = await respostaJson('https://www.googleapis.com/drive/v3/files', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'AvantaLab Backups', mimeType: 'application/vnd.google-apps.folder' }) });
  return String(criado.id);
}

export async function enviarBackupNuvem(provedor: ProvedorBackupNuvem, accessToken: string, pastaId: string, nome: string, arquivo: ArrayBuffer) {
  if (provedor === 'onedrive') {
    return respostaJson(`https://graph.microsoft.com/v1.0/me/special/approot:/${encodeURIComponent(nome)}:/content`, { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: arquivo });
  }
  const limite = `avantalab-${randomBytes(12).toString('hex')}`;
  const meta = JSON.stringify({ name: nome, parents: [pastaId] });
  const corpo = new Blob([`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${limite}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`, arquivo, `\r\n--${limite}--`]);
  return respostaJson('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${limite}` }, body: corpo });
}

export async function listarBackupsNuvem(provedor: ProvedorBackupNuvem, accessToken: string, pastaId: string) {
  if (provedor === 'onedrive') {
    const dados = await respostaJson('https://graph.microsoft.com/v1.0/me/special/approot/children?$select=id,name,size,lastModifiedDateTime,file&$orderby=lastModifiedDateTime desc', { headers: { Authorization: `Bearer ${accessToken}` } });
    return (dados.value || []).filter((item: any) => item.file && /\.xlsx$/i.test(item.name || '')).map((item: any) => ({ id: item.id, nome: item.name, tamanho: Number(item.size || 0), criadoEm: item.lastModifiedDateTime }));
  }
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', `'${pastaId}' in parents and trashed = false and mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`);
  url.searchParams.set('fields', 'files(id,name,size,createdTime,modifiedTime)'); url.searchParams.set('orderBy', 'createdTime desc');
  const dados = await respostaJson(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  return (dados.files || []).map((item: any) => ({ id: item.id, nome: item.name, tamanho: Number(item.size || 0), criadoEm: item.modifiedTime || item.createdTime }));
}

export async function baixarBackupNuvem(provedor: ProvedorBackupNuvem, accessToken: string, id: string) {
  const url = provedor === 'google_drive'
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(id)}/content`;
  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, redirect: 'follow' });
  if (!resposta.ok) throw new Error('Não foi possível baixar o backup da nuvem.');
  return resposta.arrayBuffer();
}
