import { mapCompanyProfile } from './management-catalog-bridge.mjs';
export const COMPANY_PROFILE_SAVE_REQUEST = 'AVANTALAB_VENDAS_COMPANY_SAVE_V1';
export const COMPANY_PROFILE_SAVE_RESPONSE = 'AVANTALAB_VENDAS_COMPANY_SAVED_V1';
const regimes = { 'Simples Nacional':'simples_nacional', 'Lucro Presumido':'lucro_presumido', 'Lucro Real':'lucro_real' };
export function companyProfilePatch(company) {
  const city = String(company?.city || '').match(/^(.*)\/([A-Za-z]{2})$/);
  if (!city) throw new Error('Informe o município e a UF, por exemplo São Paulo/SP.');
  const digits = value => String(value || '').replace(/\D/g,'');
  return {
    nome_fantasia:String(company.name || '').trim(), razao_social:String(company.legalName || '').trim(),
    documento:digits(company.document), cep:digits(company.cep), rua:String(company.street || '').trim(),
    numero:String(company.number || '').trim(), complemento:String(company.complement || '').trim(),
    bairro:String(company.district || '').trim(), cidade:city[1].trim(), estado:city[2].toUpperCase(),
    telefone:digits(company.phone), email_empresa:String(company.email || '').trim().toLowerCase(),
    inscricao_estadual:company.stateRegistration === 'ISENTO' ? '' : String(company.stateRegistration || '').trim(),
    inscricao_estadual_isento:company.stateRegistration === 'ISENTO',
    inscricao_municipal:company.municipalRegistration === 'ISENTO' ? '' : String(company.municipalRegistration || '').trim(),
    inscricao_municipal_isento:company.municipalRegistration === 'ISENTO',
    regime_tributario:regimes[company.taxRegime] || String(company.taxRegime || ''),
  };
}
// O token permanece no hospedeiro autenticado. O iframe não recebe credenciais.
export async function saveCompanyProfile({companyId,company,token,fetcher=fetch}) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(companyId)) throw new Error('Confirme a sessão e o perfil empresarial.');
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const url=`/api/perfil-cadastro?empresaId=${encodeURIComponent(companyId)}`;
  const read=async()=>{
    const response=await fetcher(url,{headers,cache:'no-store'});
    const payload=await response.json();
    if (!response.ok || !payload.ok || payload.cadastro?.empresa_id!==companyId || payload.tipoPerfil!=='empresa') throw new Error(payload.mensagem || 'Não foi possível confirmar o cadastro da empresa.');
    return payload;
  };
  const current=await read();
  if (!current.podeEditar) throw new Error('Somente gestores e administradores podem editar o cadastro da empresa.');
  const patch=companyProfilePatch(company);
  const response=await fetcher('/api/perfil-cadastro',{method:'PUT',headers,cache:'no-store',body:JSON.stringify({empresaId:companyId,concluir:false,dados:{...current.cadastro,...patch}})});
  const payload=await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.mensagem || 'Não foi possível salvar o cadastro da empresa.');
  const confirmed=await read();
  if (Object.entries(patch).some(([key,value])=>(confirmed.cadastro[key] ?? '')!==value)) throw new Error('A Gestão não confirmou todos os dados gravados. Confira o cadastro e tente novamente.');
  return {cadastro:confirmed.cadastro,company:mapCompanyProfile(confirmed.cadastro,companyId)};
}
