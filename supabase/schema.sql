-- ==============================================================================
-- SISTEMA DE ESCALAS MESC - COMUNIDADE SANTA CRUZ
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS POSTGRESQL / SUPABASE
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Função utilitária para atualização automática de updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABELA: ministros
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ministros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ministros_updated_at
    BEFORE UPDATE ON public.ministros
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ministros_nome ON public.ministros(nome);
CREATE INDEX IF NOT EXISTS idx_ministros_ativo ON public.ministros(ativo);

-- ==============================================================================
-- 4. TABELA: escalas (Escalas anuais com período de vigência)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_escala_periodo CHECK (data_fim >= data_inicio)
);

CREATE TRIGGER trg_escalas_updated_at
    BEFORE UPDATE ON public.escalas
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_escalas_ativa ON public.escalas(ativa);
CREATE INDEX IF NOT EXISTS idx_escalas_periodo ON public.escalas(data_inicio, data_fim);

-- ==============================================================================
-- 5. TABELA: celebracoes_recorrentes
-- Regra mensal: dia da semana (0=Dom a 6=Sáb), ocorrência no mês (1ª a 5ª), horário
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.celebracoes_recorrentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escala_id UUID NOT NULL REFERENCES public.escalas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    ocorrencia_mes SMALLINT NOT NULL CHECK (ocorrencia_mes BETWEEN 1 AND 5),
    horario TIME NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_celebracoes_recorrentes_updated_at
    BEFORE UPDATE ON public.celebracoes_recorrentes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_celebracoes_recorrentes_escala 
    ON public.celebracoes_recorrentes(escala_id);
CREATE INDEX IF NOT EXISTS idx_celebracoes_recorrentes_lookup 
    ON public.celebracoes_recorrentes(escala_id, dia_semana, ocorrencia_mes);

-- ==============================================================================
-- 6. TABELA: celebracao_recorrente_ministros (Relacionamento N:N Normalizado)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.celebracao_recorrente_ministros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    celebracao_recorrente_id UUID NOT NULL REFERENCES public.celebracoes_recorrentes(id) ON DELETE CASCADE,
    ministro_id UUID NOT NULL REFERENCES public.ministros(id) ON DELETE RESTRICT,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_celebracao_recorrente_ministro UNIQUE (celebracao_recorrente_id, ministro_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_celebracao 
    ON public.celebracao_recorrente_ministros(celebracao_recorrente_id);
CREATE INDEX IF NOT EXISTS idx_crm_ministro 
    ON public.celebracao_recorrente_ministros(ministro_id);

-- ==============================================================================
-- 7. TABELA: celebracoes_especiais (Celebrações pontuais por data)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.celebracoes_especiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escala_id UUID NOT NULL REFERENCES public.escalas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    data DATE NOT NULL,
    horario TIME NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_celebracoes_especiais_updated_at
    BEFORE UPDATE ON public.celebracoes_especiais
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_celebracoes_especiais_escala_data 
    ON public.celebracoes_especiais(escala_id, data);

-- ==============================================================================
-- 8. TABELA: celebracao_especial_ministros (Relacionamento N:N Normalizado)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.celebracao_especial_ministros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    celebracao_especial_id UUID NOT NULL REFERENCES public.celebracoes_especiais(id) ON DELETE CASCADE,
    ministro_id UUID NOT NULL REFERENCES public.ministros(id) ON DELETE RESTRICT,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_celebracao_especial_ministro UNIQUE (celebracao_especial_id, ministro_id)
);

CREATE INDEX IF NOT EXISTS idx_cem_celebracao 
    ON public.celebracao_especial_ministros(celebracao_especial_id);
CREATE INDEX IF NOT EXISTS idx_cem_ministro 
    ON public.celebracao_especial_ministros(ministro_id);

-- ==============================================================================
-- 9. TABELA: excecoes_escala (Substituições e ausências pontuais por data)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.excecoes_escala (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escala_id UUID NOT NULL REFERENCES public.escalas(id) ON DELETE CASCADE,
    celebracao_recorrente_id UUID REFERENCES public.celebracoes_recorrentes(id) ON DELETE CASCADE,
    celebracao_especial_id UUID REFERENCES public.celebracoes_especiais(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    ministro_original_id UUID NOT NULL REFERENCES public.ministros(id) ON DELETE RESTRICT,
    ministro_substituto_id UUID REFERENCES public.ministros(id) ON DELETE RESTRICT,
    motivo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_excecao_alvo CHECK (
        (celebracao_recorrente_id IS NOT NULL AND celebracao_especial_id IS NULL) OR
        (celebracao_recorrente_id IS NULL AND celebracao_especial_id IS NOT NULL)
    )
);

CREATE TRIGGER trg_excecoes_escala_updated_at
    BEFORE UPDATE ON public.excecoes_escala
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_excecoes_escala_busca 
    ON public.excecoes_escala(escala_id, data);
CREATE INDEX IF NOT EXISTS idx_excecoes_escala_ministro_orig 
    ON public.excecoes_escala(ministro_original_id);

-- ==============================================================================
-- 10. TABELA: historico_alteracoes (Auditoria)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.historico_alteracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tabela TEXT NOT NULL,
    registro_id UUID NOT NULL,
    acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
    dados_anteriores JSONB,
    dados_novos JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historico_tabela_reg 
    ON public.historico_alteracoes(tabela, registro_id);
CREATE INDEX IF NOT EXISTS idx_historico_data 
    ON public.historico_alteracoes(created_at DESC);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- Todas as tabelas têm RLS ativado para que apenas usuários autenticados da
-- coordenação tenham permissão de leitura, criação e edição.
-- ==============================================================================

ALTER TABLE public.ministros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebracoes_recorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebracao_recorrente_ministros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebracoes_especiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebracao_especial_ministros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excecoes_escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_alteracoes ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados
CREATE POLICY "Permitir tudo para autenticados em ministros"
    ON public.ministros
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo para autenticados em escalas"
    ON public.escalas
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo para autenticados em celebracoes_recorrentes"
    ON public.celebracoes_recorrentes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo para autenticados em celebracao_recorrente_ministros"
    ON public.celebracao_recorrente_ministros
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo para autenticados em celebracoes_especiais"
    ON public.celebracoes_especiais
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo para autenticados em celebracao_especial_ministros"
    ON public.celebracao_especial_ministros
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo para autenticados em excecoes_escala"
    ON public.excecoes_escala
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir leitura e inserção de histórico para autenticados"
    ON public.historico_alteracoes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
