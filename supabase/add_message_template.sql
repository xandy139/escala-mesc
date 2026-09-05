-- ==============================================================================
-- ADICIONA CAMPOS DE TEMPLATE E MENSAGEM CUSTOMIZADA EM whatsapp_bot_state
-- ==============================================================================

-- 1. Coluna para persistir o modelo personalizado do texto de notificação
ALTER TABLE public.whatsapp_bot_state 
ADD COLUMN IF NOT EXISTS message_template TEXT;

-- 2. Coluna para envio manual customizado imediato (texto editado)
ALTER TABLE public.whatsapp_bot_state 
ADD COLUMN IF NOT EXISTS custom_message TEXT;

-- 3. Coluna para as menções (@) do envio manual customizado
ALTER TABLE public.whatsapp_bot_state 
ADD COLUMN IF NOT EXISTS custom_mentions JSONB DEFAULT '[]'::jsonb;

-- Comentários das colunas
COMMENT ON COLUMN public.whatsapp_bot_state.message_template IS 'Modelo personalizado de notificação do WhatsApp com variáveis dinâmicas ({celebracao}, {data}, etc)';
COMMENT ON COLUMN public.whatsapp_bot_state.custom_message IS 'Mensagem de texto pontual para envio imediato via comando SEND_CUSTOM';
COMMENT ON COLUMN public.whatsapp_bot_state.custom_mentions IS 'Lista de JIDs do WhatsApp para marcação com @ no comando SEND_CUSTOM';
