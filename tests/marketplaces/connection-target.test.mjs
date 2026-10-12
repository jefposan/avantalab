import assert from 'node:assert/strict';
import test from 'node:test';
import { connectionTarget, validateConnectionAuthorization } from '../../app/marketplaces/connection-target.ts';

test('conectar usa endpoint e janela separados por plataforma, sem alterar a conta de publicação',()=>{
  assert.equal(connectionTarget('mercado_livre').endpoint,'/api/modulos/marketplaces/conexoes/mercado-livre/iniciar');
  assert.equal(connectionTarget('magalu').endpoint,'/api/modulos/marketplaces/conexoes/magalu/iniciar');
  assert.notEqual(connectionTarget('mercado_livre').popup,connectionTarget('magalu').popup);
  assert.throws(()=>connectionTarget('shopee'));
});
test('redirecionamento aceita somente o domínio e caminho oficiais da plataforma escolhida',()=>{
  for(const [provider,url] of [['mercado_livre','https://auth.mercadolivre.com.br/authorization?state=fixture'],['magalu','https://id.magalu.com/login?state=fixture']]){
    assert.equal(validateConnectionAuthorization(provider,url),url);
    for(const bad of [undefined,'invalid','javascript:alert(1)','https://evil.example/login','https://id.magalu.com.evil.example/login','https://user:secret@id.magalu.com/login','https://id.magalu.com/login#hash', provider==='magalu'?'https://auth.mercadolivre.com.br/authorization':'https://id.magalu.com/login']) assert.throws(()=>validateConnectionAuthorization(provider,bad));
  }
});
