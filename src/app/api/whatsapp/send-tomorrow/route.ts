import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: { groupIdOverride?: string } = {};
    try {
      body = await req.json();
    } catch {
      // opcional
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    // Envia comando SEND_TEST para o bot na Discloud
    const updates: Record<string, unknown> = {
      id: 'singleton',
      command: 'SEND_TEST',
      command_result: null,
      updated_at: new Date().toISOString(),
    };
    if (body.groupIdOverride) {
      updates.selected_group_id = body.groupIdOverride;
    }

    await supabase
      .from('whatsapp_bot_state')
      .upsert(updates, { onConflict: 'id' });

    // Aguarda até 4 segundos para ver se o bot na Discloud já executou o comando e reportou o resultado
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const { data: check } = await supabase
        .from('whatsapp_bot_state')
        .select('command_result, command')
        .eq('id', 'singleton')
        .maybeSingle();

      if (check?.command_result) {
        return NextResponse.json({
          success: check.command_result.success,
          message: check.command_result.message,
          sentCount: 1,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Comando de envio recebido pelo Bot na Discloud! O disparo está em andamento no WhatsApp.',
      sentCount: 1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao solicitar disparo';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
