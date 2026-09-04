import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, text, mentions } = body;

    if (!groupId || !text) {
      return NextResponse.json(
        { error: 'Parâmetros "groupId" e "text" são obrigatórios.' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    // Envia comando ao bot na Discloud
    await supabase
      .from('whatsapp_bot_state')
      .upsert({
        id: 'singleton',
        command: 'SEND_TEST',
        selected_group_id: groupId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    return NextResponse.json({
      success: true,
      message: 'Comando de envio enviado com sucesso ao Bot na Discloud!',
      messageId: `cmd_${Date.now()}`,
      matchedCount: mentions?.length || 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao enviar comando';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
