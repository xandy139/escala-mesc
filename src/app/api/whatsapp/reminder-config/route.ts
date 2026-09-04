import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    const { data: row } = await supabase
      .from('whatsapp_bot_state')
      .select('reminder_enabled, reminder_time, selected_group_id')
      .eq('id', 'singleton')
      .maybeSingle();

    return NextResponse.json({
      enabled: Boolean(row?.reminder_enabled),
      time: row?.reminder_time || '20:00',
      groupId: row?.selected_group_id || '',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao obter configurações';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.enabled === 'boolean') updates.reminder_enabled = body.enabled;
    if (typeof body.time === 'string') updates.reminder_time = body.time;
    if (typeof body.groupId === 'string') updates.selected_group_id = body.groupId;

    await supabase
      .from('whatsapp_bot_state')
      .upsert({ id: 'singleton', ...updates }, { onConflict: 'id' });

    return NextResponse.json({
      enabled: body.enabled,
      time: body.time,
      groupId: body.groupId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao salvar configurações';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
