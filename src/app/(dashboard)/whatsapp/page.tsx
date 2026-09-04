import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { WhatsAppClient } from './WhatsAppClient';
import { CelebracaoRecorrenteCompleta, CelebracaoEspecialCompleta, EscalaDoDiaResolvida } from '@/types/domain';
import { Ministro, ExcecaoEscala } from '@/types/database.types';
import { resolveScheduleForDate } from '@/lib/domain/schedule-resolver';

export const dynamic = 'force-dynamic';

export default async function WhatsAppPage() {
  const supabase = await createClient();

  const { data: escalaAtiva } = await supabase
    .from('escalas')
    .select('*')
    .eq('ativa', true)
    .maybeSingle();

  const proximasMissas: EscalaDoDiaResolvida[] = [];

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

    const celebracoesRecorrentes: CelebracaoRecorrenteCompleta[] = (
      (recData as unknown as RawRec[]) || []
    ).map((r) => ({
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

    const celebracoesEspeciais: CelebracaoEspecialCompleta[] = (
      (espData as unknown as RawEsp[]) || []
    ).map((e) => ({
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

    const { data: excData } = await supabase
      .from('excecoes_escala')
      .select('*')
      .eq('escala_id', escalaAtiva.id);

    const excecoes: ExcecaoEscala[] = excData || [];

    const { data: minData } = await supabase
      .from('ministros')
      .select('*')
      .eq('ativo', true);

    const ministrosMap: Record<string, Ministro> = {};
    (minData || []).forEach((m) => {
      ministrosMap[m.id] = m;
    });

    const hoje = new Date();
    const escalaInicio = new Date(escalaAtiva.data_inicio + 'T00:00:00');
    const dataBase = hoje < escalaInicio ? escalaInicio : hoje;

    for (let i = 0; i < 21; i++) {
      const dataIter = new Date(dataBase);
      dataIter.setDate(dataBase.getDate() + i);
      const y = dataIter.getFullYear();
      const m = String(dataIter.getMonth() + 1).padStart(2, '0');
      const d = String(dataIter.getDate()).padStart(2, '0');
      const isoStr = `${y}-${m}-${d}`;

      const resolved = resolveScheduleForDate({
        date: isoStr,
        escala: escalaAtiva,
        celebracoesRecorrentes,
        celebracoesEspeciais,
        excecoes,
        ministrosCadastrados: ministrosMap,
      });

      if (resolved.celebracoes.length > 0) {
        proximasMissas.push(resolved);
      }
    }
  }

  return <WhatsAppClient proximasMissas={proximasMissas} />;
}
