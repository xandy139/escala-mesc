'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { DIAS_DA_SEMANA, OCORRENCIAS_MES } from '@/types/domain';
import { X, CalendarPlus } from 'lucide-react';

interface NovaCelebracaoModalProps {
  escalaId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NovaCelebracaoModal({
  escalaId,
  isOpen,
  onClose,
  onSuccess,
}: NovaCelebracaoModalProps) {
  const [descricao, setDescricao] = useState('Missa de Domingo');
  const [diaSemana, setDiaSemana] = useState<number>(0); // Domingo
  const [ocorrenciaMes, setOcorrenciaMes] = useState<number>(1); // 1ª ocorrência
  const [horario, setHorario] = useState('08:00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!descricao.trim()) {
      setError('A descrição da celebração é obrigatória.');
      return;
    }

    if (!horario) {
      setError('O horário da celebração é obrigatório.');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      const { error: insertErr } = await supabase
        .from('celebracoes_recorrentes')
        .insert({
          escala_id: escalaId,
          descricao: descricao.trim(),
          dia_semana: diaSemana,
          ocorrencia_mes: ocorrenciaMes,
          horario: horario.length === 5 ? `${horario}:00` : horario,
          ativo: true,
        });

      if (insertErr) throw insertErr;

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar celebração';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Nova Celebração Recorrente
              </h3>
              <p className="text-xs text-slate-500">
                Regra mensal recorrente por dia e horário
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Input
            id="desc"
            label="Descrição da Missa / Celebração *"
            placeholder="Ex: Missa de Domingo"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Dia da Semana *
              </label>
              <select
                value={diaSemana}
                onChange={(e) => setDiaSemana(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
              >
                {DIAS_DA_SEMANA.map((dia, index) => (
                  <option key={dia} value={index}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Ocorrência no Mês *
              </label>
              <select
                value={ocorrenciaMes}
                onChange={(e) => setOcorrenciaMes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
              >
                {OCORRENCIAS_MES.map((oc) => (
                  <option key={oc.valor} value={oc.valor}>
                    {oc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            id="horario"
            type="time"
            label="Horário *"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Salvar Celebração
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
