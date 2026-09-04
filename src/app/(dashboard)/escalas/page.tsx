import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Escala } from '@/types/database.types';
import { EscalasListClient } from './EscalasListClient';
import { Alert } from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

export default async function EscalasPage() {
  let escalas: Escala[] = [];
  let errorMsg: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('escalas')
      .select('*')
      .order('data_inicio', { ascending: false });

    if (error) {
      errorMsg = error.message;
    } else {
      escalas = data || [];
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Falha ao carregar escalas';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Escalas Anuais
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configuração dos períodos anuais de vigência das escalas da comunidade.
        </p>
      </div>

      {errorMsg && (
        <Alert variant="warning" title="Aviso">
          Não foi possível carregar as escalas do Supabase ({errorMsg}).
        </Alert>
      )}

      <EscalasListClient initialEscalas={escalas} />
    </div>
  );
}
