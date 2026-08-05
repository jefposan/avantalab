import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '../../../../lib/cobranca-servidor';
import { compararComReferencia, guardarEvidenciaFacial, LIMIAR_PROVA_DE_VIDA, LIMIAR_SIMILARIDADE, obterResultadoProvaDeVida } from '../../../../lib/reconhecimento-facial-servidor';

function erro(mensagem: string, status = 400) { return NextResponse.json({ erro: true, mensagem }, { status }); }
function idValido(valor: unknown) { return typeof valor === 'string' && /^[a-z0-9-]{8,128}$/i.test(valor); }
const aguardar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const sessaoId = String(corpo.sessaoId || '').trim();
  if (!idValido(sessaoId)) return erro('Sessão facial inválida.');
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) return erro('Acesso não autorizado.', 403);

  const { data: verificacao } = await acesso.db.from('ponto_facial_verificacoes')
    .select('id, tipo, status').eq('empresa_id', empresaId).eq('funcionario_user_id', acesso.usuario.id)
    .eq('sessao_provedor_id', sessaoId).maybeSingle();
  if (!verificacao || verificacao.status !== 'iniciada') return erro('Sessão facial não encontrada.', 404);

  try {
    let resultado = await obterResultadoProvaDeVida(sessaoId);
    // A análise é assíncrona: após a animação terminar, o resultado pode levar
    // alguns segundos para ficar disponível. Não reprovamos uma sessão válida
    // apenas porque a consulta chegou antes do processamento da AWS.
    for (let tentativa = 0; resultado.Status === 'IN_PROGRESS' && tentativa < 10; tentativa += 1) {
      await aguardar(500);
      resultado = await obterResultadoProvaDeVida(sessaoId);
    }
    const confianca = Number(resultado.Confidence || 0);
    const referencia = resultado.ReferenceImage?.Bytes;
    if (resultado.Status !== 'SUCCEEDED' || !referencia || confianca < LIMIAR_PROVA_DE_VIDA) {
      await acesso.db.from('ponto_facial_verificacoes').update({ status: 'reprovada', confianca_prova_vida: confianca, motivo: 'Prova de vida insuficiente.', concluido_em: new Date().toISOString() }).eq('id', verificacao.id);
      return erro(resultado.Status === 'IN_PROGRESS' ? 'A verificação demorou mais que o esperado. Tente novamente.' : 'Não foi possível confirmar a prova de vida.', 422);
    }

    if (verificacao.tipo === 'cadastro') {
      const chaveEvidencia = `${empresaId}/${acesso.usuario.id}/${verificacao.id}/referencia.jpg`;
      await guardarEvidenciaFacial(chaveEvidencia, referencia);
      await acesso.db.from('ponto_facial_funcionarios').update({ status: 'ativo', referencia_provedor_id: chaveEvidencia, consentimento_versao: 'facial-v1', consentimento_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
        .eq('empresa_id', empresaId).eq('funcionario_user_id', acesso.usuario.id);
      await acesso.db.from('ponto_facial_verificacoes').update({ status: 'aprovada', confianca_prova_vida: confianca, motivo: 'Cadastro facial confirmado.', concluido_em: new Date().toISOString() }).eq('id', verificacao.id);
      return NextResponse.json({ erro: false, aprovado: true, tipo: 'cadastro' });
    }

    const { data: funcionario } = await acesso.db.from('ponto_facial_funcionarios').select('status, referencia_provedor_id')
      .eq('empresa_id', empresaId).eq('funcionario_user_id', acesso.usuario.id).maybeSingle();
    if (!funcionario?.referencia_provedor_id || funcionario.status !== 'ativo') return erro('Seu cadastro facial precisa ser concluído antes da marcação.', 409);
    const comparacao = await compararComReferencia({ Bytes: referencia }, funcionario.referencia_provedor_id);
    const similaridade = Number(comparacao.FaceMatches?.[0]?.Similarity || 0);
    const aprovado = similaridade >= LIMIAR_SIMILARIDADE;
    await acesso.db.from('ponto_facial_verificacoes').update({ status: aprovado ? 'aprovada' : 'reprovada', confianca_prova_vida: confianca, similaridade, motivo: aprovado ? 'Identidade confirmada.' : 'A captura não corresponde ao cadastro facial.', concluido_em: new Date().toISOString() }).eq('id', verificacao.id);
    return NextResponse.json({ erro: false, aprovado, confianca, similaridade });
  } catch (cause) {
    console.error('Falha ao finalizar prova de vida:', cause);
    await acesso.db.from('ponto_facial_verificacoes').update({ status: 'erro', motivo: 'Falha técnica na validação facial.', concluido_em: new Date().toISOString() }).eq('id', verificacao.id);
    return erro('Não foi possível concluir a validação facial.', 502);
  }
}
