import { NextResponse } from 'next/server';
import { exigirAdmin, possuiSenhaPersonalizada, salvarNovaSenhaAdmin } from '../../lib/admin-server';

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();
    return NextResponse.json({ erro: false, senhaPersonalizada: await possuiSenhaPersonalizada(db) });
  } catch (error) {
    console.error('Erro ao carregar configurações administrativas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar as configurações.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const { novaSenha, confirmarSenha } = await request.json();
    if (typeof novaSenha !== 'string' || novaSenha.length < 10) {
      return NextResponse.json({ erro: true, mensagem: 'A nova senha deve ter pelo menos 10 caracteres.' }, { status: 400 });
    }
    if (novaSenha !== confirmarSenha) {
      return NextResponse.json({ erro: true, mensagem: 'A confirmação da senha não confere.' }, { status: 400 });
    }

    await salvarNovaSenhaAdmin(db, novaSenha);
    return NextResponse.json({ erro: false, mensagem: 'Senha administrativa atualizada.' });
  } catch (error) {
    console.error('Erro ao alterar senha administrativa:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível alterar a senha. Execute a migração administrativa primeiro.' }, { status: 500 });
  }
}
