import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ImpressaoClient } from './ImpressaoClient';
import { CelebracaoRecorrenteCompleta, CelebracaoEspecialCompleta } from '@/types/domain';
import { Ministro, ExcecaoEscala } from '@/types/database.types';
import { Alert } from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

export default async function ImpressaoPage() {
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

    const { data: excData } = await supabase
      .from('excecoes_escala')
      .select('*')
      .eq('escala_id', escalaAtiva.id);

    if (excData) {
      excecoes = excData;
    }
  }

  const { data: minData } = await supabase
    .from('ministros')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  const todosMinistrosAtivos: Ministro[] = minData || [];

  return (
    <div className="space-y-4">
      {!escalaAtiva && (
        <Alert variant="warning" title="Atenção">
          Nenhuma escala anual ativa encontrada para impressão.
        </Alert>
      )}

      <ImpressaoClient
        escalaAtiva={escalaAtiva}
        celebracoesRecorrentes={celebracoesRecorrentes}
        celebracoesEspeciais={celebracoesEspeciais}
        excecoes={excecoes}
        todosMinistrosAtivos={todosMinistrosAtivos}
      />
    </div>
  );
}
