'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Escala, Ministro, ExcecaoEscala } from '@/types/database.types';
import {
  CelebracaoRecorrenteCompleta,
  CelebracaoEspecialCompleta,
  EscalaDoDiaResolvida,
  CelebracaoDoDia,
} from '@/types/domain';
import { resolveScheduleForDate } from '@/lib/domain/schedule-resolver';
import { classifyCelebration } from '@/lib/domain/recurrence';
import { Button } from '@/components/ui/Button';
import { DetalhesDiaModal } from './DetalhesDiaModal';
import { NovaExcecaoModal } from '@/app/(dashboard)/excecoes/NovaExcecaoModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  Sun,
  Moon,
  Repeat,
  Info,
} from 'lucide-react';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DIAS_SEMANA_CABECALHO = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

interface CalendarioClientProps {
  escalaAtiva: Escala | null;
  celebracoesRecorrentes: CelebracaoRecorrenteCompleta[];
  celebracoesEspeciais: CelebracaoEspecialCompleta[];
  excecoes: ExcecaoEscala[];
  todosMinistrosAtivos: Ministro[];
}

export function CalendarioClient({
  escalaAtiva,
  celebracoesRecorrentes,
  celebracoesEspeciais,
  excecoes,
  todosMinistrosAtivos,
}: CalendarioClientProps) {
  const router = useRouter();

  // Data inicial: se houver escala ativa, tenta focar no início da escala ou no ano/mês atual
  const hoje = new Date();
  const defaultYear = escalaAtiva
    ? parseInt(escalaAtiva.data_inicio.slice(0, 4), 10)
    : hoje.getFullYear();
  const defaultMonth = escalaAtiva
    ? Math.max(0, parseInt(escalaAtiva.data_inicio.slice(5, 7), 10) - 1)
    : hoje.getMonth();

  const [ano, setAno] = useState<number>(defaultYear);
  const [mes, setMes] = useState<number>(defaultMonth);

  // Modal de Detalhes do Dia
  const [selectedDaySchedule, setSelectedDaySchedule] =
    useState<EscalaDoDiaResolvida | null>(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);

  // Modal de Nova Substituição
  const [isNovaExcecaoOpen, setIsNovaExcecaoOpen] = useState(false);
  const [prefilledSubstDate, setPrefilledSubstDate] = useState<string>('');

  const ministrosMap: Record<string, Ministro> = {};
  todosMinistrosAtivos.forEach((m) => {
    ministrosMap[m.id] = m;
  });

  const handlePrevMonth = () => {
    if (mes === 0) {
      setMes(11);
      setAno((prev) => prev - 1);
    } else {
      setMes((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (mes === 11) {
      setMes(0);
      setAno((prev) => prev + 1);
    } else {
      setMes((prev) => prev + 1);
    }
  };

  const handleHoje = () => {
    const now = new Date();
    setAno(now.getFullYear());
    setMes(now.getMonth());
  };

  // Cálculos da grade do mês
  const firstDayOfWeek = new Date(ano, mes, 1).getDay(); // 0 (Domingo) a 6 (Sábado)
  const totalDaysInMonth = new Date(ano, mes + 1, 0).getDate();

  // Dias do mês anterior para preencher o início
  const totalDaysInPrevMonth = new Date(ano, mes, 0).getDate();
  const prevMonthDays = Array.from(
    { length: firstDayOfWeek },
    (_, i) => totalDaysInPrevMonth - firstDayOfWeek + i + 1
  );

  // Dias do mês atual resolvidos
  const currentMonthDays = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const diaNum = i + 1;
    const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(
      diaNum
    ).padStart(2, '0')}`;

    if (!escalaAtiva) return { diaNum, dateStr, resolved: null };

    const resolved = resolveScheduleForDate({
      date: dateStr,
      escala: escalaAtiva,
      celebracoesRecorrentes,
      celebracoesEspeciais,
      excecoes,
      ministrosCadastrados: ministrosMap,
    });

    return { diaNum, dateStr, resolved };
  });

  // Dias do próximo mês para completar a grade em múltiplos de 7
  const totalCellsSoFar = prevMonthDays.length + currentMonthDays.length;
  const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => i + 1);

  const handleDayClick = (dayData: {
    diaNum: number;
    dateStr: string;
    resolved: EscalaDoDiaResolvida | null;
  }) => {
    if (dayData.resolved) {
      setSelectedDaySchedule(dayData.resolved);
      setIsDetalhesOpen(true);
    }
  };

  const handleOpenSubstituicaoForDate = (dataISO: string) => {
    setPrefilledSubstDate(dataISO);
    setIsDetalhesOpen(false);
    setIsNovaExcecaoOpen(true);
  };

  // Helper para renderizar pílula da celebração no dia
  const renderCelebrationPill = (
    cel: CelebracaoDoDia,
    diaSemana: number
  ) => {
    const hasSubstituto = cel.ministros.some((m) => m.isSubstituto);

    if (cel.tipo === 'ESPECIAL') {
      return (
        <div
          key={cel.celebracaoId}
          className="flex items-center justify-between gap-1 px-1.5 py-1 rounded bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-medium leading-tight truncate"
        >
          <div className="flex items-center gap-1 min-w-0 truncate">
            <Sparkles className="w-2.5 h-2.5 text-purple-700 shrink-0" />
            <span className="truncate">{cel.horario.slice(0, 5)} {cel.descricao}</span>
          </div>
          {hasSubstituto && (
            <span title="Possui substituição" className="shrink-0">
              <Repeat className="w-2.5 h-2.5 text-amber-700" />
            </span>
          )}
        </div>
      );
    }

    const cat = classifyCelebration(diaSemana, cel.horario);
    if (cat === 'MANHA') {
      return (
        <div
          key={cel.celebracaoId}
          className="flex items-center justify-between gap-1 px-1.5 py-1 rounded bg-amber-100/80 text-amber-900 border border-amber-200 text-[10px] font-medium leading-tight truncate"
        >
          <div className="flex items-center gap-1 min-w-0 truncate">
            <Sun className="w-2.5 h-2.5 text-amber-700 shrink-0" />
            <span className="truncate">{cel.horario.slice(0, 5)} {cel.descricao}</span>
          </div>
          {hasSubstituto && (
            <span title="Possui substituição" className="shrink-0">
              <Repeat className="w-2.5 h-2.5 text-amber-700" />
            </span>
          )}
        </div>
      );
    }

    if (cat === 'NOITE') {
      return (
        <div
          key={cel.celebracaoId}
          className="flex items-center justify-between gap-1 px-1.5 py-1 rounded bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-medium leading-tight truncate"
        >
          <div className="flex items-center gap-1 min-w-0 truncate">
            <Moon className="w-2.5 h-2.5 text-indigo-700 shrink-0" />
            <span className="truncate">{cel.horario.slice(0, 5)} {cel.descricao}</span>
          </div>
          {hasSubstituto && (
            <span title="Possui substituição" className="shrink-0">
              <Repeat className="w-2.5 h-2.5 text-amber-700" />
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        key={cel.celebracaoId}
        className="flex items-center justify-between gap-1 px-1.5 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-medium leading-tight truncate"
      >
        <div className="flex items-center gap-1 min-w-0 truncate">
          <CalendarIcon className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
          <span className="truncate">{cel.horario.slice(0, 5)} {cel.descricao}</span>
        </div>
        {hasSubstituto && (
          <span title="Possui substituição" className="shrink-0">
            <Repeat className="w-2.5 h-2.5 text-amber-700" />
          </span>
        )}
      </div>
    );
  };

  const hojeISO = hoje.toISOString().split('T')[0];

  return (
    <div className="space-y-5">
      {/* Barra de Controle de Navegação do Mês */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Mês anterior"
              className="p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Próximo mês"
              className="p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {MESES[mes]} de {ano}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={handleHoje}
            className="text-xs h-8"
          >
            Hoje
          </Button>
        </div>

        {/* Legenda de Categorias */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            Manhã
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            Noite
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Diária
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            Especial
          </span>
          <span className="flex items-center gap-1 text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            <Repeat className="w-3 h-3" />
            Troca/Substituição
          </span>
        </div>
      </div>

      {!escalaAtiva && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Nenhuma escala anual ativa no momento. As missas recorrentes só serão projetadas quando houver uma escala definida como ativa.
          </span>
        </div>
      )}

      {/* Grade do Calendário */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2.5">
          {DIAS_SEMANA_CABECALHO.map((dia, idx) => (
            <div
              key={dia}
              className={`text-xs font-bold uppercase tracking-wider ${
                idx === 0 || idx === 6 ? 'text-emerald-800' : 'text-slate-600'
              }`}
            >
              <span className="hidden md:inline">{dia}</span>
              <span className="md:hidden">{dia.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Células de Dias */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {/* Dias anteriores (desabilitados) */}
          {prevMonthDays.map((d) => (
            <div
              key={`prev-${d}`}
              className="min-h-[90px] sm:min-h-[110px] p-2 bg-slate-50/50 text-slate-300 select-none"
            >
              <span className="text-xs font-semibold">{d}</span>
            </div>
          ))}

          {/* Dias do Mês Atual */}
          {currentMonthDays.map((item) => {
            const hasCelebracoes =
              item.resolved && item.resolved.celebracoes.length > 0;
            const isHoje = item.dateStr === hojeISO;

            return (
              <div
                key={item.dateStr}
                onClick={() => handleDayClick(item)}
                className={`min-h-[90px] sm:min-h-[115px] p-1.5 sm:p-2 transition-all flex flex-col justify-between ${
                  hasCelebracoes
                    ? 'cursor-pointer hover:bg-slate-50/90 bg-white'
                    : 'bg-white text-slate-400'
                } ${isHoje ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/20' : ''}`}
              >
                {/* Cabeçalho do dia */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold flex items-center justify-center h-6 w-6 rounded-full ${
                      isHoje
                        ? 'bg-emerald-800 text-white'
                        : hasCelebracoes
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.diaNum}
                  </span>

                  {hasCelebracoes && item.resolved && (
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                      {item.resolved.celebracoes.length}{' '}
                      {item.resolved.celebracoes.length === 1 ? 'missa' : 'missas'}
                    </span>
                  )}
                </div>

                {/* Lista de Pílulas de Celebração */}
                <div className="space-y-1 my-1 flex-1 overflow-hidden">
                  {item.resolved?.celebracoes.map((cel) =>
                    renderCelebrationPill(cel, item.resolved!.diaDaSemana)
                  )}
                </div>

                {/* Indicador de Ministros Totais */}
                {hasCelebracoes && item.resolved && (
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="hidden sm:inline">
                      {item.resolved.celebracoes.reduce(
                        (acc, c) => acc + c.ministros.length,
                        0
                      )}{' '}
                      ministros
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Próximos dias (desabilitados) */}
          {nextMonthDays.map((d) => (
            <div
              key={`next-${d}`}
              className="min-h-[90px] sm:min-h-[110px] p-2 bg-slate-50/50 text-slate-300 select-none"
            >
              <span className="text-xs font-semibold">{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalhes do Dia */}
      <DetalhesDiaModal
        resolvedDay={selectedDaySchedule}
        isOpen={isDetalhesOpen}
        onClose={() => setIsDetalhesOpen(false)}
        onRequestSubstituicao={handleOpenSubstituicaoForDate}
      />

      {/* Modal de Nova Substituição */}
      {escalaAtiva && (
        <NovaExcecaoModal
          escala={escalaAtiva}
          celebracoesRecorrentes={celebracoesRecorrentes}
          celebracoesEspeciais={celebracoesEspeciais}
          todosMinistrosAtivos={todosMinistrosAtivos}
          prefilledDate={prefilledSubstDate}
          isOpen={isNovaExcecaoOpen}
          onClose={() => setIsNovaExcecaoOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
