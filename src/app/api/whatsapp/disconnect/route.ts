import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    // Envia comando DISCONNECT para o bot na Discloud
    await supabase
      .from('whatsapp_bot_state')
      .upsert({
        id: 'singleton',
        command: 'DISCONNECT',
        status: 'DISCONNECTED',
        phone: null,
        qr_code: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    return NextResponse.json({ success: true, message: 'Desconectado com sucesso' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao desconectar WhatsApp';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
