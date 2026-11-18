import {isNfeAccessKey} from './fiscal-identifiers.mjs';
// CODE-128 C para pares numéricos; A para letras maiúsculas. Chaves numéricas
// mantêm exatamente a sequência anterior. 101: C→A; 99: A→C (tabela CODE-128).
export function encodeNfeBarcode(key) {
 if(!isNfeAccessKey(key))return [];
 const words=[105];let mode='C',i=0;
 while(i<key.length){
  const run=/^[0-9]+/.exec(key.slice(i))?.[0].length||0;
  if(mode==='C'){
   if(run>=2){words.push(Number(key.slice(i,i+2)));i+=2;continue;}
   words.push(101);mode='A';
  }else if(run>=4){
   if(run%2===1){words.push(key.charCodeAt(i)-32);i++;}
   words.push(99);mode='C';continue;
  }
  words.push(key.charCodeAt(i)-32);i++;
 }
 const checksum=words.reduce((sum,word,index)=>sum+word*(index||1),0)%103;
 return [...words,checksum,106];
}
