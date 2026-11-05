import {normalizarTexto} from '../../../lib/formatters.ts';

/** Resolve apenas no cadastro do perfil atual; nunca cria um tipo por inferência. */
export function reconhecerTipoPlanilha(informado:unknown,tipos:readonly string[]):string {
 const chave=normalizarTexto(informado);
 return chave?tipos.find(tipo=>normalizarTexto(tipo)===chave)||'':'';
}
export function reconciliarTipoPlanilha<T extends {tipo:string;tipoInformado?:string;tipoManual?:boolean;tipoSugeridoHistorico?:boolean}>(item:T,tipos:readonly string[]):T {
 if(item.tipoManual||!item.tipoInformado?.trim())return item;
 const tipo=reconhecerTipoPlanilha(item.tipoInformado,tipos);
 if(tipo===item.tipo&&!item.tipoSugeridoHistorico)return item;
 return {...item,tipo,tipoSugeridoHistorico:false};
}
