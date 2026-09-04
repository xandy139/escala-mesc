import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MinistroForm, MinistroVinculoEscala } from '@/components/forms/MinistroForm';
import { DIAS_DA_SEMANA } from '@/types/domain';
import { formatDateBR } from '@/lib/utils';
import { classifyCelebration } from '@/lib/domain/recurrence';

export const dynamic = 'force-dynamic';

interface EditMinistroPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMinistroPage({ params }: EditMinistroPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ministro, error } = await supabase
    .from('ministros')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !ministro) {
    notFound();
  }

  // 1. Busca vínculos em celebrações recorrentes
  type RawRecVinculo = {
    id: string;
    celebracao: {
      id: string;
      descricao: string;
      dia_semana: number;
      ocorrencia_mes: number;
      horario: string;
      escala: {
        id: string;
        nome: string;
        ativa: boolean;
      } | null;
    } | null;
  };

  const { data: recData } = await supabase
    .from('celebracao_recorrente_ministros')
    .select(`
      id,
      celebracao:celebracoes_recorrentes (
        id,
        descricao,
        dia_semana,
        ocorrencia_mes,
        horario,
        escala:escalas (id, nome, ativa)
      )
    `)
    .eq('ministro_id', id);

  // 2. Busca vínculos em celebrações especiais
  type RawEspVinculo = {
    id: string;
    celebracao: {
      id: string;
      descricao: string;
      data: string;
      horario: string;
      escala: {
        id: string;
        nome: string;
        ativa: boolean;
      } | null;
    } | null;
  };

  const { data: espData } = await supabase
    .from('celebracao_especial_ministros')
    .select(`
      id,
      celebracao:celebracoes_especiais (
        id,
        descricao,
        data,
        horario,
        escala:escalas (id, nome, ativa)
      )
    `)
    .eq('ministro_id', id);

  const vinculos: MinistroVinculoEscala[] = [];

  // Mapeia vínculos recorrentes
  const parsedRec = (recData as unknown as RawRecVinculo[]) || [];
  for (const item of parsedRec) {
    if (item.celebracao && item.celebracao.escala) {
      const c = item.celebracao;
      const e = item.celebracao.escala;
      const diaNome = DIAS_DA_SEMANA[c.dia_semana];
      const ordinal =
        c.dia_semana === 0 || c.dia_semana === 6
          ? `${c.ocorrencia_mes}º`
          : `${c.ocorrencia_mes}ª`;

      vinculos.push({
        tipo: 'RECORRENTE',
        categoria: classifyCelebration(c.dia_semana, c.horario),
        escalaId: e.id,
        escalaNome: e.nome,
        escalaAtiva: e.ativa,
        celebracaoDescricao: c.descricao,
        detalheHorario: `Todo ${ordinal} ${diaNome} às ${c.horario.slice(0, 5)}`,
      });
    }
  }

  // Mapeia vínculos especiais
  const parsedEsp = (espData as unknown as RawEspVinculo[]) || [];
  for (const item of parsedEsp) {
    if (item.celebracao && item.celebracao.escala) {
      const c = item.celebracao;
      const e = item.celebracao.escala;

      vinculos.push({
        tipo: 'ESPECIAL',
        escalaId: e.id,
        escalaNome: e.nome,
        escalaAtiva: e.ativa,
        celebracaoDescricao: c.descricao,
        detalheHorario: `${formatDateBR(c.data)} às ${c.horario.slice(0, 5)}`,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Editar Ministro
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Altere as informações de contato, status e consulte as celebrações atribuídas.
        </p>
      </div>

      <MinistroForm ministro={ministro} vinculos={vinculos} />
    </div>
  );
}
