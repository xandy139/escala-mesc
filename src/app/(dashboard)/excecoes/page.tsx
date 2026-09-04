import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ExcecoesListClient, ExcecaoDetalhada } from './ExcecoesListClient';
import { CelebracaoRecorrenteCompleta, CelebracaoEspecialCompleta } from '@/types/domain';
import { Ministro } from '@/types/database.types';
import { Alert } from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

export default async function ExcecoesPage() {
  const supabase = await createClient();

  // 1. Busca escala ativa
  const { data: escalaAtiva } = await supabase
    .from('escalas')
    .select('*')
    .eq('ativa', true)
    .maybeSingle();

  // 2. Busca histórico de exceções
  type RawExcecaoJoin = {
    id: string;
    data: string;
    motivo: string | null;
    escala: { id: string; nome: string } | null;
    ministro_original: { id: string; nome: string; telefone: string | null } | null;
    ministro_substituto: { id: string; nome: string; telefone: string | null } | null;
    celebracao_recorrente: { id: string; descricao: string; horario: string } | null;
    celebracao_especial: { id: string; descricao: string; horario: string } | null;
  };

  const { data: rawExcecoes, error: excErr } = await supabase
    .from('excecoes_escala')
    .select(`
      id,
      data,
      motivo,
      escala:escalas(id, nome),
      ministro_original:ministros!excecoes_escala_ministro_original_id_fkey(id, nome, telefone),
      ministro_substituto:ministros!excecoes_escala_ministro_substituto_id_fkey(id, nome, telefone),
      celebracao_recorrente:celebracoes_recorrentes(id, descricao, horario),
      celebracao_especial:celebracoes_especiais(id, descricao, horario)
    `)
    .order('data', { ascending: false });

  // 3. Busca celebrações da escala ativa para alimentar o modal de nova substituição
  let celebracoesRecorrentes: CelebracaoRecorrenteCompleta[] = [];
  let celebracoesEspeciais: CelebracaoEspecialCompleta[] = [];

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
  }

  // 4. Busca ministros ativos
  const { data: minData } = await supabase
    .from('ministros')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  const todosMinistrosAtivos: Ministro[] = minData || [];

  // Mapeia exceções para a interface de visualização
  const parsedExcecoes: ExcecaoDetalhada[] = (
    (rawExcecoes as unknown as RawExcecaoJoin[]) || []
  )
    .filter((e) => e.ministro_original !== null)
    .map((e) => {
      const celNome =
        e.celebracao_recorrente?.descricao ||
        e.celebracao_especial?.descricao ||
        'Celebração';
      const hora =
        e.celebracao_recorrente?.horario ||
        e.celebracao_especial?.horario ||
        '00:00';

      return {
        id: e.id,
        data: e.data,
        motivo: e.motivo,
        escala: {
          id: e.escala?.id || '',
          nome: e.escala?.nome || 'Escala',
        },
        celebracaoNome: celNome,
        horario: hora,
        ministroOriginal: {
          id: e.ministro_original!.id,
          nome: e.ministro_original!.nome,
          telefone: e.ministro_original!.telefone,
        },
        ministroSubstituto: e.ministro_substituto
          ? {
              id: e.ministro_substituto.id,
              nome: e.ministro_substituto.nome,
              telefone: e.ministro_substituto.telefone,
            }
          : null,
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Exceções & Substituições de Ministros
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Registro de trocas e ausências pontuais em datas específicas sem alterar a escala anual permanente.
        </p>
      </div>

      {excErr && (
        <Alert variant="warning" title="Aviso">
          Erro ao carregar lista de exceções: {excErr.message}
        </Alert>
      )}

      {!escalaAtiva && (
        <Alert variant="warning" title="Atenção">
          Nenhuma escala anual está definida como ativa no momento. Para registrar novas substituições, defina uma escala como ativa em Escalas Anuais.
        </Alert>
      )}

      <ExcecoesListClient
        initialExcecoes={parsedExcecoes}
        escalaAtiva={escalaAtiva}
        celebracoesRecorrentes={celebracoesRecorrentes}
        celebracoesEspeciais={celebracoesEspeciais}
        todosMinistrosAtivos={todosMinistrosAtivos}
      />
    </div>
  );
}
