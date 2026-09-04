'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Escala, Ministro } from '@/types/database.types';
import { CelebracaoRecorrenteCompleta, CelebracaoEspecialCompleta } from '@/types/domain';
import { resolveScheduleForDate } from '@/lib/domain/schedule-resolver';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { X, UserCheck, Calendar } from 'lucide-react';

interface NovaExcecaoModalProps {
  escala: Escala;
  celebracoesRecorrentes: CelebracaoRecorrenteCompleta[];
  celebracoesEspeciais: CelebracaoEspecialCompleta[];
  todosMinistrosAtivos: Ministro[];
  prefilledDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NovaExcecaoModal({
  escala,
  celebracoesRecorrentes,
  celebracoesEspeciais,
  todosMinistrosAtivos,
  prefilledDate,
  isOpen,
  onClose,
  onSuccess,
}: NovaExcecaoModalProps) {
  const [data, setData] = useState(
    prefilledDate || new Date().toISOString().split('T')[0]
  );
  const [userSelectedCelebrationKey, setUserSelectedCelebrationKey] = useState<string | null>(null);
  const [userSelectedOriginalMinistroId, setUserSelectedOriginalMinistroId] = useState<string | null>(null);
  const [ministroSubstitutoId, setMinistroSubstitutoId] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcula quais celebrações existem na data selecionada
  const resolved = data
    ? resolveScheduleForDate({
        date: data,
        escala,
        celebracoesRecorrentes,
        celebracoesEspeciais,
        excecoes: [], // Não aplica exceções para saber quem são os ministros originais da regra
      })
    : null;

  const celebracoesDoDia = resolved?.celebracoes ?? [];

  // Celebração ativa (derivada)
  const activeCelebrationKey =
    userSelectedCelebrationKey &&
    celebracoesDoDia.some(
      (c) => `${c.tipo}_${c.celebracaoId}` === userSelectedCelebrationKey
    )
      ? userSelectedCelebrationKey
      : celebracoesDoDia.length > 0
      ? `${celebracoesDoDia[0].tipo}_${celebracoesDoDia[0].celebracaoId}`
      : '';

  const celebracaoSelecionada = celebracoesDoDia.find(
    (c) => `${c.tipo}_${c.celebracaoId}` === activeCelebrationKey
  );

  const ministrosOriginais = celebracaoSelecionada?.ministros ?? [];

  // Ministro titular ativo (derivado)
  const activeOriginalMinistroId =
    userSelectedOriginalMinistroId &&
    ministrosOriginais.some((m) => m.id === userSelectedOriginalMinistroId)
      ? userSelectedOriginalMinistroId
      : ministrosOriginais.length > 0
      ? ministrosOriginais[0].id
      : '';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!data) {
      setError('Selecione a data da substituição.');
      return;
    }

    if (!celebracaoSelecionada) {
      setError('Não há celebrações agendadas para esta data.');
      return;
    }

    if (!activeOriginalMinistroId) {
      setError('Selecione o ministro que não poderá comparecer.');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      const isRec = celebracaoSelecionada.tipo === 'RECORRENTE';

      const { error: insertErr } = await supabase.from('excecoes_escala').insert({
        escala_id: escala.id,
        celebracao_recorrente_id: isRec ? celebracaoSelecionada.celebracaoId : null,
        celebracao_especial_id: !isRec ? celebracaoSelecionada.celebracaoId : null,
        data,
        ministro_original_id: activeOriginalMinistroId,
        ministro_substituto_id: ministroSubstitutoId || null,
        motivo: motivo.trim() || null,
      });

      if (insertErr) throw insertErr;

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar substituição';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Registrar Substituição / Troca Pontual
              </h3>
              <p className="text-xs text-slate-500">
                Válida exclusivamente para a data selecionada
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
            id="dataExcecao"
            type="date"
            label="Data da Missa *"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setUserSelectedCelebrationKey(null);
              setUserSelectedOriginalMinistroId(null);
            }}
          />

          {celebracoesDoDia.length === 0 ? (
            <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-800 text-center">
              Nenhuma celebração cadastrada para esta data na escala ativa.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Missa / Celebração nesta data *
                </label>
                <select
                  value={activeCelebrationKey}
                  onChange={(e) => {
                    setUserSelectedCelebrationKey(e.target.value);
                    setUserSelectedOriginalMinistroId(null);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-600"
                >
                  {celebracoesDoDia.map((cel) => (
                    <option
                      key={`${cel.tipo}_${cel.celebracaoId}`}
                      value={`${cel.tipo}_${cel.celebracaoId}`}
                    >
                      {cel.descricao} às {cel.horario.slice(0, 5)} (
                      {cel.tipo === 'ESPECIAL' ? 'Especial' : 'Recorrente'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Ministro Titular (Quem não poderá ir) *
                </label>
                <select
                  value={activeOriginalMinistroId}
                  onChange={(e) => setUserSelectedOriginalMinistroId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-600"
                >
                  {ministrosOriginais.length === 0 && (
                    <option value="">Nenhum ministro escalado originalmente</option>
                  )}
                  {ministrosOriginais.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Ministro Substituto
                </label>
                <select
                  value={ministroSubstitutoId}
                  onChange={(e) => setMinistroSubstitutoId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
                >
                  <option value="">-- Apenas registrar ausência (sem substituto) --</option>
                  {todosMinistrosAtivos
                    .filter((m) => m.id !== activeOriginalMinistroId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                </select>
              </div>

              <Input
                id="motivo"
                label="Motivo da Substituição (opcional)"
                placeholder="Ex: Viagem de trabalho, compromisso familiar"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={celebracoesDoDia.length === 0}
              isLoading={isLoading}
            >
              <UserCheck className="w-4 h-4" />
              Confirmar Substituição
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
