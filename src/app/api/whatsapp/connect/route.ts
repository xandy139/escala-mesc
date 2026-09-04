import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(url, key);

    // Envia comando START para o bot na Discloud
    await supabase
      .from('whatsapp_bot_state')
      .upsert({
        id: 'singleton',
        command: 'START',
        status: 'CONNECTING',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    return NextResponse.json({
      status: 'CONNECTING',
      qrCodeDataUrl: null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao conectar WhatsApp';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
