import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function main() {
  const { count: ministrosCount } = await supabase.from('ministros').select('*', { count: 'exact', head: true });
  const { count: escalasCount } = await supabase.from('escalas').select('*', { count: 'exact', head: true });
  const { data: escalas } = await supabase.from('escalas').select('id, nome, ativa');
  const { count: crCount } = await supabase.from('celebracoes_recorrentes').select('*', { count: 'exact', head: true });
  const { count: crmCount } = await supabase.from('celebracao_recorrente_ministros').select('*', { count: 'exact', head: true });
  const { count: ceCount } = await supabase.from('celebracoes_especiais').select('*', { count: 'exact', head: true });
  const { count: cemCount } = await supabase.from('celebracao_especial_ministros').select('*', { count: 'exact', head: true });

  console.log('--- RESULTADO DA CARGA NO BANCO ---');
  console.log(`Ministros cadastrados: ${ministrosCount}`);
  console.log(`Escalas cadastradas: ${escalasCount}`, escalas);
  console.log(`Celebrações recorrentes: ${crCount} | Vínculos de ministros: ${crmCount}`);
  console.log(`Celebrações especiais: ${ceCount} | Vínculos de ministros: ${cemCount}`);
}

main();
