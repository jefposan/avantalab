import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { CONSULTAS_CREDITO, type TipoConsultaCredito } from '@/app/lib/carteira';
import { autenticarCarteira, CABECALHOS_PRIVADOS } from '@/app/lib/carteira-servidor';
import { consultarDirectData, ErroDirectData } from '@/lib/consultas/providers/directdata';
import { validarDocumentoCredito } from '@/lib/consultas/validators/documento';
import type { ResultadoConsultaCredito } from '@/lib/consultas/credito-types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const empresaId = String(corpo?.empresaId || '').trim(); const tipoConsulta = String(corpo?.tipoConsulta || '') as TipoConsultaCredito;
  const pacote = CONSULTAS_CREDITO[tipoConsulta]; const documento = validarDocumentoCredito(corpo?.documento);
  if (!pacote || !documento.valido || !empresaId) return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Confira o documento e o tipo de consulta.' } }, { status: 400, headers: CABECALHOS_PRIVADOS });
  const contexto = await autenticarCarteira(request, empresaId);
  if (!contexto) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Entre novamente para realizar a consulta.' } }, { status: 401, headers: CABECALHOS_PRIVADOS });
  if (!process.env.DIRECT_DATA_TOKEN?.trim()) return NextResponse.json({ success: false, error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'A consulta de crédito está em validação e ainda não foi liberada.' } }, { status: 503, headers: CABECALHOS_PRIVADOS });
  const idempotencia = String(request.headers.get('idempotency-key') || randomUUID()).slice(0, 100);
  const { data: consultaId, error: erroConsumo } = await contexto.db.rpc('consumir_credito_consulta', { p_empresa_id: empresaId, p_usuario_id: contexto.usuario.id, p_documento: documento.documento, p_tipo_documento: documento.tipo, p_tipo_consulta: tipoConsulta, p_valor_centavos: pacote.precoCentavos, p_idempotencia: idempotencia });
  if (erroConsumo) {
    const saldoInsuficiente = erroConsumo.message?.includes('saldo_insuficiente');
    return NextResponse.json({ success: false, error: { code: saldoInsuficiente ? 'INSUFFICIENT_BALANCE' : 'INTERNAL_ERROR', message: saldoInsuficiente ? 'Saldo insuficiente. Adicione créditos para continuar.' : 'Não foi possível iniciar a consulta.' } }, { status: saldoInsuficiente ? 402 : 500, headers: CABECALHOS_PRIVADOS });
  }
  try {
    const fontes = await consultarDirectData(documento.documento, documento.tipo, tipoConsulta); const consultadoEm = new Date().toISOString();
    const resultado: ResultadoConsultaCredito = { id: consultaId, documento: documento.documento, tipoDocumento: documento.tipo, tipoConsulta, nomeConsulta: pacote.nome, valorCentavos: pacote.precoCentavos, fontes, provedor: 'DIRECT_DATA', consultadoEm };
    await contexto.db.from('consultas_credito').update({ status: 'concluida', resultado_json: resultado, consultado_em: consultadoEm, atualizado_em: consultadoEm }).eq('id', consultaId);
    return NextResponse.json({ success: true, data: resultado }, { headers: CABECALHOS_PRIVADOS });
  } catch (erro) {
    const codigo = erro instanceof ErroDirectData ? erro.codigo : 'INDISPONIVEL';
    await contexto.db.rpc('estornar_credito_consulta', { p_consulta_id: consultaId, p_erro_codigo: codigo });
    const naoEncontrado = codigo === 'NAO_ENCONTRADO'; const timeout = codigo === 'TIMEOUT';
    return NextResponse.json({ success: false, error: { code: codigo, message: naoEncontrado ? 'Não encontramos dados para o documento informado.' : timeout ? 'O serviço demorou mais que o esperado para responder. O valor foi estornado.' : 'O serviço está temporariamente indisponível. O valor foi estornado.' } }, { status: naoEncontrado ? 404 : timeout ? 504 : 503, headers: CABECALHOS_PRIVADOS });
  }
}
