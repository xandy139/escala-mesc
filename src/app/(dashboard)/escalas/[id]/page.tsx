import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Ministro } from '@/types/database.types';
import {
  EscalaDetailClient,
  CelebracaoRecorrenteComMinistros,
  CelebracaoEspecialComMinistros,
} from './EscalaDetailClient';

export const dynamic = 'force-dynamic';

interface EscalaDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EscalaDetailPage({ params }: EscalaDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Carrega dados da escala
  const { data: escala, error: escalaErr } = await supabase
    .from('escalas')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (escalaErr || !escala) {
    notFound();
  }

  // 2. Carrega celebrações recorrentes com ministros vinculados
  const { data: recData } = await supabase
    .from('celebracoes_recorrentes')
    .select(`
      id,
      escala_id,
      descricao,
      dia_semana,
      ocorrencia_mes,
      horario,
      ativo,
      celebracao_recorrente_ministros (
        id,
        ordem,
        ministro:ministros (
          id,
          nome,
          telefone,
          ativo
        )
      )
    `)
    .eq('escala_id', id)
    .order('dia_semana', { ascending: true })
    .order('horario', { ascending: true })
    .order('ocorrencia_mes', { ascending: true });

  // 3. Carrega celebrações especiais com ministros vinculados
  const { data: espData } = await supabase
    .from('celebracoes_especiais')
    .select(`
      id,
      escala_id,
      descricao,
      data,
      horario,
      observacoes,
      celebracao_especial_ministros (
        id,
        ordem,
        ministro:ministros (
          id,
          nome,
          telefone,
          ativo
        )
      )
    `)
    .eq('escala_id', id)
    .order('data', { ascending: true })
    .order('horario', { ascending: true });

  // 4. Carrega todos os ministros ativos para os dropdowns de seleção
  const { data: minData } = await supabase
    .from('ministros')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  // Mapear celebrações recorrentes tipadas
  type RawRecRecord = {
    id: string;
    escala_id: string;
    descricao: string;
    dia_semana: number;
    ocorrencia_mes: number;
    horario: string;
    ativo: boolean;
    celebracao_recorrente_ministros: Array<{
      id: string;
      ordem: number;
      ministro: {
        id: string;
        nome: string;
        telefone: string | null;
        ativo: boolean;
      } | null;
    }>;
  };

  const parsedRecorrentes: CelebracaoRecorrenteComMinistros[] = (
    (recData as unknown as RawRecRecord[]) || []
  ).map((cr) => ({
    id: cr.id,
    escala_id: cr.escala_id,
    descricao: cr.descricao,
    dia_semana: cr.dia_semana,
    ocorrencia_mes: cr.ocorrencia_mes,
    horario: cr.horario,
    ativo: cr.ativo,
    ministros: cr.celebracao_recorrente_ministros
      .filter((crm) => crm.ministro !== null)
      .map((crm) => ({
        vinculoId: crm.id,
        ordem: crm.ordem,
        ministro: crm.ministro!,
      })),
  }));

  // Mapear celebrações especiais tipadas
  type RawEspRecord = {
    id: string;
    escala_id: string;
    descricao: string;
    data: string;
    horario: string;
    observacoes: string | null;
    celebracao_especial_ministros: Array<{
      id: string;
      ordem: number;
      ministro: {
        id: string;
        nome: string;
        telefone: string | null;
        ativo: boolean;
      } | null;
    }>;
  };

  const parsedEspeciais: CelebracaoEspecialComMinistros[] = (
    (espData as unknown as RawEspRecord[]) || []
  ).map((ce) => ({
    id: ce.id,
    escala_id: ce.escala_id,
    descricao: ce.descricao,
    data: ce.data,
    horario: ce.horario,
    observacoes: ce.observacoes,
    ministros: ce.celebracao_especial_ministros
      .filter((cem) => cem.ministro !== null)
      .map((cem) => ({
        vinculoId: cem.id,
        ordem: cem.ordem,
        ministro: cem.ministro!,
      })),
  }));

  const todosMinistrosAtivos: Ministro[] = minData || [];

  return (
    <EscalaDetailClient
      escala={escala}
      initialCelebracoesRecorrentes={parsedRecorrentes}
      initialCelebracoesEspeciais={parsedEspeciais}
      todosMinistrosAtivos={todosMinistrosAtivos}
    />
  );
}
