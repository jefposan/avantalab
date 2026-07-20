import { NextResponse } from 'next/server';
import { exigirAdmin } from '@/app/lib/admin-server';

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
    const { data, error } = await db.from('empresas').select('id, nome').order('nome').limit(1000);
    if (error) throw error;
    return NextResponse.json({ erro: false, empresas: data || [] });
  } catch { return NextResponse.json({ erro: true, mensagem: 'Não foi possível listar as empresas.' }, { status: 500 }); }
}
