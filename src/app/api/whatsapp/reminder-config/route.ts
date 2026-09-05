import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    let { data: row, error } = await supabase
      .from('whatsapp_bot_state')
      .select('reminder_enabled, reminder_time, selected_group_id, message_template')
      .eq('id', 'singleton')
      .maybeSingle();

    if (error && (error.code === '42703' || error.message?.includes('message_template'))) {
      // Coluna message_template ainda não existe no DB, faz fallback seguro
      const retry = await supabase
        .from('whatsapp_bot_state')
        .select('reminder_enabled, reminder_time, selected_group_id')
        .eq('id', 'singleton')
        .maybeSingle();
      row = retry.data ? { ...retry.data, message_template: null } : null;
    }

    return NextResponse.json({
      enabled: Boolean(row?.reminder_enabled),
      time: row?.reminder_time || '20:00',
      groupId: row?.selected_group_id || '',
      messageTemplate: (row?.message_template as string | null) || null,
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
    if (typeof body.messageTemplate === 'string' || body.messageTemplate === null) {
      updates.message_template = body.messageTemplate;
    }

    let { error } = await supabase
      .from('whatsapp_bot_state')
      .upsert({ id: 'singleton', ...updates }, { onConflict: 'id' });

    let columnMissing = false;
    if (error && (error.code === '42703' || error.message?.includes('message_template'))) {
      columnMissing = true;
      delete updates.message_template;
      const retry = await supabase
        .from('whatsapp_bot_state')
        .upsert({ id: 'singleton', ...updates }, { onConflict: 'id' });
      error = retry.error;
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({
      enabled: body.enabled,
      time: body.time,
      groupId: body.groupId,
      messageTemplate: body.messageTemplate,
      columnMissing,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao salvar configurações';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
