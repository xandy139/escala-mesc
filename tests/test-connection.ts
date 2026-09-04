import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis do .env.local manualmente para o teste
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('--- Verificação de Conexão com o Supabase ---');
console.log(`URL configurada: ${supabaseUrl ? supabaseUrl : '(vazia)'}`);

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  console.log('⚠️ As variáveis do Supabase ainda contêm valores placeholder ou estão vazias.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testando consulta à tabela "ministros"...');
    const { data: ministros, error: errMin } = await supabase
      .from('ministros')
      .select('id, nome, ativo')
      .limit(5);

    if (errMin) {
      console.log(`❌ Erro ao consultar 'ministros': ${errMin.message}`);
      if (errMin.message.includes('relation "public.ministros" does not exist')) {
        console.log('👉 As tabelas ainda não foram criadas no Supabase. Execute o arquivo "supabase/schema.sql" no SQL Editor do Supabase.');
      }
    } else {
      console.log(`✅ Tabela 'ministros' acessada com sucesso! (${ministros.length} registros encontrados)`);
    }

    console.log('Testando consulta à tabela "escalas"...');
    const { data: escalas, error: errEsc } = await supabase
      .from('escalas')
      .select('id, nome, ativa')
      .limit(5);

    if (errEsc) {
      console.log(`❌ Erro ao consultar 'escalas': ${errEsc.message}`);
      if (errEsc.message.includes('relation "public.escalas" does not exist')) {
        console.log('👉 Execute o arquivo "supabase/schema.sql" no SQL Editor do Supabase.');
      }
    } else {
      console.log(`✅ Tabela 'escalas' acessada com sucesso! (${escalas.length} registros encontrados)`);
    }

    console.log('Testando consulta à tabela "celebracoes_recorrentes"...');
    const { error: errCel } = await supabase
      .from('celebracoes_recorrentes')
      .select('id')
      .limit(1);

    if (errCel) {
      console.log(`❌ Erro ao consultar 'celebracoes_recorrentes': ${errCel.message}`);
    } else {
      console.log(`✅ Tabela 'celebracoes_recorrentes' verificada com sucesso!`);
    }

    console.log('\n--- Resultado do Teste de Conexão ---');
    if (!errMin && !errEsc && !errCel) {
      console.log('🎉 BANCO DE DADOS SUPABASE CONFIGURADO E OPERACIONAL!');
    } else {
      console.log('⚠️ Houve erros ao acessar algumas tabelas. Verifique se o script schema.sql foi executado.');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Exceção ao conectar no Supabase:', msg);
  }
}

testConnection();
