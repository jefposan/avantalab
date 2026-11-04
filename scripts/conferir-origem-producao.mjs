import { createHash } from 'node:crypto';

export const REMOTO_OFICIAL = 'https://github.com/jefposan/avantalab.git';

// A referência é consultada na rede em cada envio: origin/main local pode estar antiga.
// A guarda só lê Git e os arquivos do commit; não aplica SQL nem modifica a main.
export async function conferirOrigemProducao({ rodar, manifesto }) {
  if (manifesto?.reconciliationStatus === 'blocked-audit') throw new Error('Reconciliação com auditoria pendente; produção bloqueada.');
  if (await rodar('git', ['remote', 'get-url', 'origin']) !== REMOTO_OFICIAL) {
    throw new Error('Produção exige o remoto oficial do AvantaLab.');
  }
  const identidade = await rodar('git', ['log', '-1', '--format=%an <%ae>%n%cn <%ce>']);
  if (identidade !== 'Jeff <jefposan@hotmail.com>\nJeff <jefposan@hotmail.com>') {
    throw new Error('Autor e committer devem ser Jeff <jefposan@hotmail.com>.');
  }
  const resposta = await rodar('git', ['ls-remote', '--exit-code', 'origin', 'refs/heads/main']);
  const correspondencia = resposta.match(/^([a-f0-9]{40})\s+refs\/heads\/main$/);
  if (!correspondencia) throw new Error('Não foi possível confirmar a main remota; produção bloqueada.');
  const main = correspondencia[1];
  const hash = await rodar('git', ['rev-parse', 'HEAD']);
  // Igualdade também garante alcance e impede publicar um ancestral desatualizado.
  if (hash !== main) throw new Error('Produção exige o SHA exato da main oficial atual. Integre e refaça o pacote antes de enviar.');
  if (!Array.isArray(manifesto?.migrations)) {
    throw new Error('Declare migrations no avanta-entrega.json, inclusive [] quando não houver aplicação de banco.');
  }
  const vistos = new Set();
  for (const migracao of manifesto.migrations) {
    if (!/^supabase\/migrations\/\d{14}_[a-zA-Z0-9_-]+\.sql$/.test(migracao?.path ?? '') ||
        !/^[a-f0-9]{64}$/.test(migracao?.sha256 ?? '') || vistos.has(migracao.path)) {
      throw new Error('Plano de migrações inválido; produção bloqueada.');
    }
    vistos.add(migracao.path);
    // ls-tree exige blob regular, impedindo links e arquivos fora do snapshot.
    const registro = await rodar('git', ['ls-tree', hash, '--', migracao.path]);
    if (!/^100644 blob [a-f0-9]{40}\t/.test(registro)) throw new Error('Migração deve pertencer ao mesmo commit da produção.');
    const conteudo = await rodar('git', ['show', `${hash}:${migracao.path}`]);
    if (createHash('sha256').update(conteudo).digest('hex') !== migracao.sha256) {
      throw new Error('Conteúdo da migração diverge do plano versionado.');
    }
  }
  return { hash, main, migrations: manifesto.migrations };
}
