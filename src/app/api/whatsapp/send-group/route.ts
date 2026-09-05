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

    // Prepara comando SEND_CUSTOM com a mensagem editada e menções reais
    const updates: Record<string, unknown> = {
      id: 'singleton',
      command: 'SEND_CUSTOM',
      selected_group_id: groupId,
      custom_message: text,
      custom_mentions: mentions || [],
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from('whatsapp_bot_state')
      .upsert(updates, { onConflict: 'id' });

    // Fallback se colunas custom_message ou custom_mentions ainda não tiverem sido adicionadas no Supabase
    if (error && (error.code === '42703' || error.message?.includes('custom_message') || error.message?.includes('custom_mentions'))) {
      delete updates.custom_message;
      delete updates.custom_mentions;
      updates.command = 'SEND_TEST';
      const retry = await supabase
        .from('whatsapp_bot_state')
        .upsert(updates, { onConflict: 'id' });
      error = retry.error;
    }

    if (error) {
      throw error;
    }

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
