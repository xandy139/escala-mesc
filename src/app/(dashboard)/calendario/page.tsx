import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { CalendarioClient } from './CalendarioClient';
import { CelebracaoRecorrenteCompleta, CelebracaoEspecialCompleta } from '@/types/domain';
import { Ministro, ExcecaoEscala } from '@/types/database.types';
import { Alert } from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

export default async function CalendarioPage() {
  const supabase = await createClient();

  // 1. Busca escala ativa
  const { data: escalaAtiva } = await supabase
    .from('escalas')
    .select('*')
    .eq('ativa', true)
    .maybeSingle();

  let celebracoesRecorrentes: CelebracaoRecorrenteCompleta[] = [];
  let celebracoesEspeciais: CelebracaoEspecialCompleta[] = [];
  let excecoes: ExcecaoEscala[] = [];

  if (escalaAtiva) {
    // 2. Carrega celebrações recorrentes com ministros
    type RawRec = {
      id: string;
      escala_id: string;
      descricao: string;
      dia_semana: number;
      ocorrencia_mes: number;
      horario: string;
      ativo: boolean;
      created_at: string;
      updated_at: string;
      celebracao_recorrente_ministros: Array<{
        ordem: number;
        ministro: { id: string; nome: string; telefone: string | null } | null;
      }>;
    };

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
        created_at,
        updated_at,
        celebracao_recorrente_ministros (
          ordem,
          ministro:ministros (id, nome, telefone)
        )
      `)
      .eq('escala_id', escalaAtiva.id)
      .eq('ativo', true);

    if (recData) {
      celebracoesRecorrentes = (recData as unknown as RawRec[]).map((r) => ({
        id: r.id,
        escala_id: r.escala_id,
        descricao: r.descricao,
        dia_semana: r.dia_semana,
        ocorrencia_mes: r.ocorrencia_mes,
        horario: r.horario,
        ativo: r.ativo,
        created_at: r.created_at,
        updated_at: r.updated_at,
        ministros: r.celebracao_recorrente_ministros
          .filter((crm) => crm.ministro !== null)
          .map((crm) => ({
            id: crm.ministro!.id,
            nome: crm.ministro!.nome,
            telefone: crm.ministro!.telefone,
            ordem: crm.ordem,
          })),
      }));
    }

    // 3. Carrega celebrações especiais com ministros
    type RawEsp = {
      id: string;
      escala_id: string;
      descricao: string;
      data: string;
      horario: string;
      observacoes: string | null;
      created_at: string;
      updated_at: string;
      celebracao_especial_ministros: Array<{
        ordem: number;
        ministro: { id: string; nome: string; telefone: string | null } | null;
      }>;
    };

    const { data: espData } = await supabase
      .from('celebracoes_especiais')
      .select(`
        id,
        escala_id,
        descricao,
        data,
        horario,
        observacoes,
        created_at,
        updated_at,
        celebracao_especial_ministros (
          ordem,
          ministro:ministros (id, nome, telefone)
        )
      `)
      .eq('escala_id', escalaAtiva.id);

    if (espData) {
      celebracoesEspeciais = (espData as unknown as RawEsp[]).map((e) => ({
        id: e.id,
        escala_id: e.escala_id,
        descricao: e.descricao,
        data: e.data,
        horario: e.horario,
        observacoes: e.observacoes,
        created_at: e.created_at,
        updated_at: e.updated_at,
        ministros: e.celebracao_especial_ministros
          .filter((cem) => cem.ministro !== null)
          .map((cem) => ({
            id: cem.ministro!.id,
            nome: cem.ministro!.nome,
            telefone: cem.ministro!.telefone,
            ordem: cem.ordem,
          })),
      }));
    }

    // 4. Carrega exceções da escala
    const { data: excData } = await supabase
      .from('excecoes_escala')
      .select('*')
      .eq('escala_id', escalaAtiva.id);

    if (excData) {
      excecoes = excData;
    }
  }

  // 5. Carrega todos os ministros
  const { data: minData } = await supabase
    .from('ministros')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  const todosMinistrosAtivos: Ministro[] = minData || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Calendário da Escala
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {escalaAtiva
            ? `Visualização mensal das datas reais calculadas pela ${escalaAtiva.nome}, com identificação de turnos e substituições.`
            : 'Visualização das datas do calendário.'}
        </p>
      </div>

      {!escalaAtiva && (
        <Alert variant="warning" title="Atenção">
          Nenhuma escala anual está definida como ativa no momento. As celebrações não serão projetadas até que uma escala esteja ativa em Escalas Anuais.
        </Alert>
      )}

      <CalendarioClient
        escalaAtiva={escalaAtiva}
        celebracoesRecorrentes={celebracoesRecorrentes}
        celebracoesEspeciais={celebracoesEspeciais}
        excecoes={excecoes}
        todosMinistrosAtivos={todosMinistrosAtivos}
      />
    </div>
  );
}
