-- ==============================================================================
-- PERMISSÕES DE LEITURA PÚBLICA PARA AGENDADOR EM SEGUNDO PLANO
-- Execute este script no SQL Editor do Supabase se desejar que o agendador
-- em segundo plano consulte o banco mesmo sem nenhum usuário logado.
-- ==============================================================================

-- 1. Leitura de escalas
DROP POLICY IF EXISTS "Permitir leitura publica em escalas" ON public.escalas;
CREATE POLICY "Permitir leitura publica em escalas" 
    ON public.escalas FOR SELECT TO anon USING (true);

-- 2. Leitura de ministros
DROP POLICY IF EXISTS "Permitir leitura publica em ministros" ON public.ministros;
CREATE POLICY "Permitir leitura publica em ministros" 
    ON public.ministros FOR SELECT TO anon USING (true);

-- 3. Leitura de celebrações recorrentes
DROP POLICY IF EXISTS "Permitir leitura publica em celebracoes_recorrentes" ON public.celebracoes_recorrentes;
CREATE POLICY "Permitir leitura publica em celebracoes_recorrentes" 
    ON public.celebracoes_recorrentes FOR SELECT TO anon USING (true);

-- 4. Leitura de vínculos recorrentes
DROP POLICY IF EXISTS "Permitir leitura publica em celebracao_recorrente_ministros" ON public.celebracao_recorrente_ministros;
CREATE POLICY "Permitir leitura publica em celebracao_recorrente_ministros" 
    ON public.celebracao_recorrente_ministros FOR SELECT TO anon USING (true);

-- 5. Leitura de celebrações especiais
DROP POLICY IF EXISTS "Permitir leitura publica em celebracoes_especiais" ON public.celebracoes_especiais;
CREATE POLICY "Permitir leitura publica em celebracoes_especiais" 
    ON public.celebracoes_especiais FOR SELECT TO anon USING (true);

-- 6. Leitura de vínculos especiais
DROP POLICY IF EXISTS "Permitir leitura publica em celebracao_especial_ministros" ON public.celebracao_especial_ministros;
CREATE POLICY "Permitir leitura publica em celebracao_especial_ministros" 
    ON public.celebracao_especial_ministros FOR SELECT TO anon USING (true);

-- 7. Leitura de exceções
DROP POLICY IF EXISTS "Permitir leitura publica em excecoes_escala" ON public.excecoes_escala;
CREATE POLICY "Permitir leitura publica em excecoes_escala" 
    ON public.excecoes_escala FOR SELECT TO anon USING (true);
