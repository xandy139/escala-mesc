import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Ministro } from '@/types/database.types';
import { MinistrosListClient } from './MinistrosListClient';
import { Alert } from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

export default async function MinistrosPage() {
  let ministros: Ministro[] = [];
  let errorMsg: string | null = null;
  const vinculosCountMap: Record<string, number> = {};
  let activeScaleNome: string | null = null;

  try {
    const supabase = await createClient();

    // 1. Carrega todos os ministros
    const { data, error } = await supabase
      .from('ministros')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      errorMsg = error.message;
    } else {
      ministros = data || [];
    }

    // 2. Busca escala ativa para associar contadores
    const { data: activeScale } = await supabase
      .from('escalas')
      .select('id, nome')
      .eq('ativa', true)
      .maybeSingle();

    if (activeScale) {
      activeScaleNome = activeScale.nome;

      type RawRecVinculo = {
        ministro_id: string;
      };

      const { data: recData } = await supabase
        .from('celebracao_recorrente_ministros')
        .select(`
          ministro_id,
          celebracao:celebracoes_recorrentes!inner(escala_id)
        `)
        .eq('celebracao.escala_id', activeScale.id);

      if (recData) {
        for (const item of (recData as unknown as RawRecVinculo[])) {
          vinculosCountMap[item.ministro_id] =
            (vinculosCountMap[item.ministro_id] || 0) + 1;
        }
      }

      type RawEspVinculo = {
        ministro_id: string;
      };

      const { data: espData } = await supabase
        .from('celebracao_especial_ministros')
        .select(`
          ministro_id,
          celebracao:celebracoes_especiais!inner(escala_id)
        `)
        .eq('celebracao.escala_id', activeScale.id);

      if (espData) {
        for (const item of (espData as unknown as RawEspVinculo[])) {
          vinculosCountMap[item.ministro_id] =
            (vinculosCountMap[item.ministro_id] || 0) + 1;
        }
      }
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Falha ao carregar ministros';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Ministros da Sagrada Comunhão
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {activeScaleNome
            ? `Cadastro geral de ministros e acompanhamento das participações na ${activeScaleNome}.`
            : 'Cadastro geral de ministros extraordinários para composição das escalas.'}
        </p>
      </div>

      {errorMsg && (
        <Alert variant="warning" title="Aviso">
          Não foi possível carregar a lista de ministros do Supabase ({errorMsg}).
        </Alert>
      )}

      <MinistrosListClient
        initialMinistros={ministros}
        vinculosCountMap={vinculosCountMap}
        activeScaleNome={activeScaleNome}
      />
    </div>
  );
}
