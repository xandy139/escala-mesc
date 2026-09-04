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
      .select('*')
      .eq('id', 'singleton')
      .maybeSingle();

    if (!row) {
      return NextResponse.json({
        status: 'DISCONNECTED',
        hasSavedSession: false,
        qrCodeDataUrl: null,
        connectedPhone: null,
        connectedName: null,
        lastError: null,
      });
    }

    return NextResponse.json({
      status: row.status || 'DISCONNECTED',
      hasSavedSession: row.status === 'CONNECTED',
      qrCodeDataUrl: row.qr_code || null,
      connectedPhone: row.phone || null,
      connectedName: null,
      lastError: null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao consultar status';
    return NextResponse.json({ status: 'DISCONNECTED', error: msg });
  }
}
