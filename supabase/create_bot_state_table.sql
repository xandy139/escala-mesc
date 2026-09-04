-- ==============================================================================
-- TABELA DE ESTADO E SINCRONIZAÇÃO DO BOT WHATSAPP (DISCLOUD <-> VERCEL)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_bot_state (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    status TEXT NOT NULL DEFAULT 'DISCONNECTED', -- 'DISCONNECTED', 'CONNECTING', 'QR_READY', 'CONNECTED'
    qr_code TEXT,
    phone TEXT,
    groups JSONB DEFAULT '[]'::jsonb,
    selected_group_id TEXT,
    selected_group_name TEXT,
    reminder_time TEXT DEFAULT '20:00',
    reminder_enabled BOOLEAN DEFAULT true,
    last_run_date TEXT,
    command TEXT, -- 'START', 'DISCONNECT', 'SEND_TEST'
    command_result JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insere o registro singleton inicial caso não exista
INSERT INTO public.whatsapp_bot_state (id, status, reminder_time, reminder_enabled)
VALUES ('singleton', 'DISCONNECTED', '20:00', true)
ON CONFLICT (id) DO NOTHING;

-- Habilita Row Level Security (RLS)
ALTER TABLE public.whatsapp_bot_state ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: permite leitura e atualização por usuários da plataforma e agendador
DROP POLICY IF EXISTS "Permitir leitura publica em whatsapp_bot_state" ON public.whatsapp_bot_state;
CREATE POLICY "Permitir leitura publica em whatsapp_bot_state"
    ON public.whatsapp_bot_state FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir atualizacao publica em whatsapp_bot_state" ON public.whatsapp_bot_state;
CREATE POLICY "Permitir atualizacao publica em whatsapp_bot_state"
    ON public.whatsapp_bot_state FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir insercao publica em whatsapp_bot_state" ON public.whatsapp_bot_state;
CREATE POLICY "Permitir insercao publica em whatsapp_bot_state"
    ON public.whatsapp_bot_state FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Habilita escuta em tempo real no Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'whatsapp_bot_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_bot_state;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignora caso a publicação padrão não exista
END $$;
