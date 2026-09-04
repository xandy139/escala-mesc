import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    const { data: row } = await supabase
      .from('whatsapp_bot_state')
      .select('groups')
      .eq('id', 'singleton')
      .maybeSingle();

    const rawGroups = row?.groups || [];
    // Formata no padrão esperado pelo componente: { id, subject, size }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups = rawGroups.map((g: any) => ({
      id: g.id,
      subject: g.name || g.subject || 'Sem Nome',
      size: g.participantsCount || g.size || 0,
    }));

    return NextResponse.json({ groups });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao buscar grupos do WhatsApp';
    return NextResponse.json({ error: msg, groups: [] }, { status: 500 });
  }
}
