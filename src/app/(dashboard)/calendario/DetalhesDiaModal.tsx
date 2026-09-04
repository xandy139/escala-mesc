'use client';

import React from 'react';
import { EscalaDoDiaResolvida, CelebracaoDoDia } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { formatDateBR, formatPhoneNumber } from '@/lib/utils';
import { classifyCelebration } from '@/lib/domain/recurrence';
import {
  X,
  Calendar,
  Clock,
  Repeat,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Sparkles,
  Phone,
} from 'lucide-react';

interface DetalhesDiaModalProps {
  resolvedDay: EscalaDoDiaResolvida | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestSubstituicao: (data: string) => void;
}

export function DetalhesDiaModal({
  resolvedDay,
  isOpen,
  onClose,
  onRequestSubstituicao,
}: DetalhesDiaModalProps) {
  if (!isOpen || !resolvedDay) return null;

  const dataFormatada = formatDateBR(resolvedDay.data);

  const renderBadgeCategoria = (cel: CelebracaoDoDia) => {
    if (cel.tipo === 'ESPECIAL') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200">
          <Sparkles className="w-3 h-3" />
          Missa Especial
        </span>
      );
    }

    const cat = classifyCelebration(resolvedDay.diaDaSemana, cel.horario);
    if (cat === 'MANHA') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
          <Sun className="w-3 h-3" />
          Missa da Manhã
        </span>
      );
    }
    if (cat === 'NOITE') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-800 border-indigo-200">
          <Moon className="w-3 h-3" />
          Missa da Noite
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
        <CalendarIcon className="w-3 h-3" />
        Missa Diária
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header do Modal */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {resolvedDay.nomeDiaDaSemana}, {dataFormatada}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {resolvedDay.descricaoOcorrencia} • {resolvedDay.escalaNome}
                </p>
              </div>
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

        {/* Lista de Celebrações do Dia */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {resolvedDay.celebracoes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/60">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma celebração agendada para esta data
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Não há regras recorrentes ou especiais vinculadas a este dia.
              </p>
            </div>
          ) : (
            resolvedDay.celebracoes.map((cel) => (
              <div
                key={cel.celebracaoId}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs"
              >
                {/* Header da Celebração */}
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {cel.descricao}
                    </span>
                    {renderBadgeCategoria(cel)}
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cel.horario.slice(0, 5)}</span>
                  </div>
                </div>

                {/* Lista de Ministros que Servem */}
                <div className="p-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Ministros Escalados ({cel.ministros.length})
                  </p>

                  {cel.ministros.length === 0 ? (
                    <p className="text-xs text-amber-700 italic bg-amber-50 p-2.5 rounded-lg border border-amber-200/60">
                      Nenhum ministro escalado para esta missa.
                    </p>
                  ) : (
                    cel.ministros.map((m, idx) => (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                          m.isSubstituto
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-slate-50/70 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {m.nome}
                              </span>
                              {m.isSubstituto && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded">
                                  <Repeat className="w-2.5 h-2.5" />
                                  Substituto(a)
                                </span>
                              )}
                            </div>

                            {m.isSubstituto && m.ministroOriginalNome && (
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                Substitui:{' '}
                                <strong className="font-semibold">
                                  {m.ministroOriginalNome}
                                </strong>
                                {m.motivoExcecao && ` (${m.motivoExcecao})`}
                              </p>
                            )}

                            {m.telefone && (
                              <p className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {formatPhoneNumber(m.telefone)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer com Botão de Ação */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRequestSubstituicao(resolvedDay.data)}
            disabled={resolvedDay.celebracoes.length === 0}
            className="text-amber-800 border-amber-300 hover:bg-amber-50"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Registrar Troca / Exceção Nesta Data</span>
          </Button>

          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
