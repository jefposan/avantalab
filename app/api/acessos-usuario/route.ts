import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { REGISTRO_MODULOS } from '@/app/lib/modulos-registro';
import { liberacoesDoVinculo, moduloPermitidoParaPapel } from '@/app/lib/acessos-usuario';
import { COBRANCA_ATIVA, assinaturaVigente } from '@/app/lib/cobranca';
import { resolverEstadosAcessoEmLote, type EmpresaEstadoAcesso } from '@/app/lib/cobranca-servidor';
import { consultarPorIds } from '@/app/lib/consultas-por-ids-servidor';

type EmpresaPerfil = EmpresaEstadoAcesso & { nome: string };
type VisualPerfil = { empresa_id: string; cor_primaria: string | null; dark_mode: boolean | null; logo_url?: string | null };
type InstalacaoPerfil = { empresa_id: string; modulo_id: string; ativo: boolean; expira_em: string | null };

export async function GET(request: Request) {
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { persistSession: false } });
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const { data: auth, error } = await db.auth.getUser(token);
    if (error && (error.name === 'AuthRetryableFetchError' || error.status === 0 || (error.status ?? 0) >= 500)) return NextResponse.json({ mensagem: 'Não foi possível comunicar com a autenticação. Sua sessão não foi encerrada; tente novamente.' }, { status: 503 });
    if (error || !auth.user) return NextResponse.json({ mensagem: 'Sua sessão expirou.' }, { status: 401 });
    const parametros = new URL(request.url).searchParams;
    const empresaId = parametros.get('empresaId');
    let query = db.from('usuarios_empresa').select('id,empresa_id,nome,perfil,status,dashboard_liberada,modulos_liberados').eq('user_id', auth.user.id).eq('status', 'ativo').neq('perfil', 'funcionario_ponto');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const vinculos = await query;
    if (vinculos.error) throw vinculos.error;
    if (!vinculos.data?.length) return NextResponse.json({ perfis: [] }, { headers: { 'Cache-Control': 'no-store' } });
    // Opt-in preserva clientes antigos. O Dashboard já lê sua logo nas configurações;
    // acessos restritos continuam recebendo a imagem do perfil selecionado.
    const adiarLogos = parametros.get('logos') === 'adiadas'
      || (parametros.get('logos') === 'dashboard' && vinculos.data.every(v => liberacoesDoVinculo(v).dashboard));
    const ids = [...new Set(vinculos.data.map(v => v.empresa_id as string))];
    const [empresas, visuais, instalacoes] = await Promise.all([
      consultarPorIds<EmpresaPerfil>(db, 'empresas', 'id,nome,tipo_perfil,created_at,assinatura_origem_empresa_id', 'id', ids),
      consultarPorIds<VisualPerfil>(db, 'configuracoes', adiarLogos ? 'empresa_id,cor_primaria,dark_mode' : 'empresa_id,cor_primaria,dark_mode,logo_url', 'empresa_id', ids),
      consultarPorIds<InstalacaoPerfil>(db, 'empresa_modulos', 'empresa_id,modulo_id,ativo,expira_em', 'empresa_id', ids, 'modulo_id'),
    ]);
    if (empresas.length !== ids.length) throw new Error('Perfil indisponível.');
    const empresasPorId = new Map(empresas.map(e => [e.id, e]));
    const visuaisPorId = new Map(visuais.map(v => [v.empresa_id, v]));
    if (empresasPorId.size !== empresas.length || visuaisPorId.size !== visuais.length) throw new Error('Perfil indisponível.');
    const ativosPorEmpresa = new Map<string, string[]>();
    const agora = Date.now();
    for (const modulo of instalacoes) {
      const vigente = !modulo.expira_em || Date.parse(modulo.expira_em) > agora;
      if (modulo.ativo !== true || !vigente) continue;
      const ativos = ativosPorEmpresa.get(modulo.empresa_id) || [];
      ativos.push(modulo.modulo_id); ativosPorEmpresa.set(modulo.empresa_id, ativos);
    }
    const estados = COBRANCA_ATIVA ? await resolverEstadosAcessoEmLote(db, empresas) : null;
    const compartilhados = await db.from('projetos_compartilhamentos').select('empresa_id').eq('user_id', auth.user.id).eq('situacao', 'ativo');
    if (compartilhados.error) throw compartilhados.error;
    const origens = [...new Set((compartilhados.data || []).map(p => p.empresa_id))];
    const instalacoesCompartilhadas = origens.length ? await db.from('empresa_modulos').select('ativo,expira_em').in('empresa_id', origens).eq('modulo_id', 'projetos').eq('ativo', true) : { data: [], error: null };
    if (instalacoesCompartilhadas.error) throw instalacoesCompartilhadas.error;
    const possuiProjetosCompartilhados = Boolean(instalacoesCompartilhadas.data?.some(m => !m.expira_em || Date.parse(m.expira_em) > Date.now()));
    const perfis = vinculos.data.map(v => {
      const empresa = empresasPorId.get(v.empresa_id)!;
      const visual = visuaisPorId.get(v.empresa_id);
      const estado = estados?.get(v.empresa_id);
      const liberacoes = liberacoesDoVinculo(v);
      const planoAtivo = !COBRANCA_ATIVA || Boolean(estado && assinaturaVigente(estado));
      const ativos = ativosPorEmpresa.get(v.empresa_id) || [];
      const modulos = REGISTRO_MODULOS.filter(m => liberacoes.modulos.includes(m.id) && moduloPermitidoParaPapel(m.id, v.perfil) && ((planoAtivo && ativos.includes(m.id)) || (m.id === 'projetos' && possuiProjetosCompartilhados))).map(m => ({ id: m.id, nome: m.nome, descricao: m.descricao, icone: m.icone }));
      return { empresa: { id: empresa.id, nome: empresa.nome, tipo_perfil: empresa.tipo_perfil, corPrimaria: visual?.cor_primaria || '#003E73', temaEscuro: visual?.dark_mode === true, ...(adiarLogos ? { logoAdiada: true } : { logoUrl: visual?.logo_url || '' }) }, nomeUsuario: v.nome, perfil: v.perfil, dashboard: liberacoes.dashboard, modulos, planoAtivo };
    });
    return NextResponse.json({ perfis }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ mensagem: 'Não foi possível carregar suas liberações. Tente novamente.' }, { status: 503 });
  }
}
