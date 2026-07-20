import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createHash, randomUUID } from 'node:crypto';
import { APP_VERSION } from '@/app/lib/version';
import { autorizarEmpresa } from '../route';

export const runtime = 'nodejs';
const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: true, mensagem }, { status });

async function gerarManual(nomeEmpresa: string) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const paginas = [
    ['MANUAL DO SISTEMA — REP-P', `AvantaLab Controle de Ponto · versão ${APP_VERSION}`, `Empresa destinatária: ${nomeEmpresa}`, '', '1. FINALIDADE', 'Este manual orienta o uso do Controle de Ponto AvantaLab para registro eletrônico de ponto via programa (REP-P), incluindo marcações, comprovantes, administração, auditoria e documentos disponíveis.', '', '2. ACESSOS E RESPONSABILIDADES', 'O colaborador registra o ponto em /ponto. Gestor Master e Administrador da empresa configuram funcionários, local, calendário, relatórios, auditoria e Conformidade. O administrador global configura certificado e dados técnicos em /admin > REP-P.', '', '3. REGISTRO E COMPROVANTE', 'Cada marcação é registrada com data e hora, tipo, dados de localização quando aplicáveis e identificador persistido. O colaborador recebe comprovante imediatamente e pode consultar o histórico de suas marcações.'],
    ['4. INTEGRIDADE E AUDITORIA', 'As marcações originam registros de auditoria e ARP com NSR sequencial por empresa. Registros e documentos emitidos são preservados; inativar funcionário bloqueia novos acessos sem apagar o histórico.', '', '5. DOCUMENTOS', 'Na aba Conformidade REP-P, a empresa pode baixar AFDs emitidos e gerar um novo AFD sem substituir os anteriores. Cada emissão guarda período, hash SHA-256, modo de emissão e histórico de download.', '', '6. STATUS DE CONFORMIDADE', 'Este manual descreve a funcionalidade disponível na versão indicada. A emissão legal em produção depende de certificado ICP-Brasil válido e a caracterização plena como REP-P depende do certificado de registro do programa de computador no INPI. Enquanto esses requisitos não estiverem concluídos, os documentos de homologação não devem ser apresentados como documentos legais definitivos.', '', '7. SUPORTE E ATUALIZAÇÕES', 'A versão do sistema consta neste documento e no painel AvantaLab. Alterações relevantes preservam o histórico técnico e devem ser avaliadas antes de uso em produção.', '', `Emitido em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`],
  ];
  for (const linhas of paginas) {
    const pagina = pdf.addPage([595.28, 841.89]); let y = 785;
    for (const linha of linhas) {
      const titulo = /^([0-9]+\. |MANUAL)/.test(linha);
      const tamanho = titulo ? 14 : 10;
      const fonte = titulo ? negrito : regular;
      const palavras = linha.split(' '); let atual = '';
      for (const palavra of palavras) {
        const teste = atual ? `${atual} ${palavra}` : palavra;
        if (fonte.widthOfTextAtSize(teste, tamanho) > 475) { pagina.drawText(atual, { x: 60, y, size: tamanho, font: fonte, color: titulo ? rgb(0, 0.24, 0.45) : rgb(0.1, 0.12, 0.16) }); y -= tamanho + 5; atual = palavra; } else atual = teste;
      }
      if (atual) pagina.drawText(atual, { x: 60, y, size: tamanho, font: fonte, color: titulo ? rgb(0, 0.24, 0.45) : rgb(0.1, 0.12, 0.16) });
      y -= linha ? tamanho + 8 : 8;
    }
    pagina.drawText(`AvantaLab · REP-P · ${APP_VERSION}`, { x: 60, y: 35, size: 8, font: regular, color: rgb(0.35, 0.4, 0.46) });
  }
  return Buffer.from(await pdf.save());
}

export async function GET(request: Request) {
  try {
    const empresaId = new URL(request.url).searchParams.get('empresaId');
    if (!empresaId) return erro('Empresa não informada.');
    const contexto = await autorizarEmpresa(request, empresaId);
    if (!contexto) return erro('Acesso não autorizado para esta empresa.', 403);
    const arquivoNome = `manual-rep-p-avantalab-${APP_VERSION}.pdf`;
    const { data: existente, error: erroExistente } = await contexto.db.from('rep_p_documentos_gerados').select('id, arquivo_nome').eq('empresa_id', empresaId).eq('tipo', 'manual').eq('arquivo_nome', arquivoNome).maybeSingle();
    if (erroExistente) throw erroExistente;
    if (existente) return NextResponse.json({ documentoId: existente.id, jaExistia: true }, { headers: { 'Cache-Control': 'private, no-store' } });
    const { data: empresa, error: erroEmpresa } = await contexto.db.from('empresas').select('nome').eq('id', empresaId).maybeSingle();
    if (erroEmpresa || !empresa) throw erroEmpresa || new Error('Empresa não encontrada.');
    const conteudo = await gerarManual(empresa.nome);
    const documentoId = randomUUID(); const storagePath = `${empresaId}/${documentoId}/${arquivoNome}`;
    const { error: erroUpload } = await contexto.db.storage.from('rep-p-documentos').upload(storagePath, conteudo, { contentType: 'application/pdf', upsert: false });
    if (erroUpload) throw erroUpload;
    const { error: erroDocumento } = await contexto.db.from('rep_p_documentos_gerados').insert({ id: documentoId, empresa_id: empresaId, tipo: 'manual', periodo_inicio: new Date().toISOString().slice(0, 10), periodo_fim: new Date().toISOString().slice(0, 10), arquivo_nome: arquivoNome, storage_path: storagePath, sha256: createHash('sha256').update(conteudo).digest('hex'), modo: 'homologacao', solicitado_por: contexto.solicitante });
    if (erroDocumento) { await contexto.db.storage.from('rep-p-documentos').remove([storagePath]); throw erroDocumento; }
    await contexto.db.from('rep_p_documentos_auditoria').insert({ documento_id: documentoId, empresa_id: empresaId, ator_user_id: contexto.solicitante, evento: 'gerado' });
    return NextResponse.json({ documentoId, jaExistia: false }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (causa) { console.error('Erro ao preparar manual REP-P:', causa); return erro('Não foi possível preparar o manual REP-P.', 500); }
}
