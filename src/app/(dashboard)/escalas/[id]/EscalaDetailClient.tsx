'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Escala, Ministro } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatDateBR, formatPhoneNumber } from '@/lib/utils';
import { DIAS_DA_SEMANA } from '@/types/domain';
import { classifyCelebration, CategoriaMissa } from '@/lib/domain/recurrence';
import { NovaCelebracaoModal } from './NovaCelebracaoModal';
import { NovaCelebracaoEspecialModal } from './NovaCelebracaoEspecialModal';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  UserPlus,
  Trash2,
  PlusCircle,
  Search,
  Sparkles,
  Loader2,
  CalendarCheck,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Zap,
} from 'lucide-react';

export interface MinistroVinculo {
  vinculoId: string;
  ordem: number;
  ministro: {
    id: string;
    nome: string;
    telefone: string | null;
    ativo: boolean;
  };
}

export interface CelebracaoRecorrenteComMinistros {
  id: string;
  escala_id: string;
  descricao: string;
  dia_semana: number;
  ocorrencia_mes: number;
  horario: string;
  ativo: boolean;
  ministros: MinistroVinculo[];
}

export interface CelebracaoEspecialComMinistros {
  id: string;
  escala_id: string;
  descricao: string;
  data: string;
  horario: string;
  observacoes: string | null;
  ministros: MinistroVinculo[];
}

interface EscalaDetailClientProps {
  escala: Escala;
  initialCelebracoesRecorrentes: CelebracaoRecorrenteComMinistros[];
  initialCelebracoesEspeciais: CelebracaoEspecialComMinistros[];
  todosMinistrosAtivos: Ministro[];
}

export function EscalaDetailClient({
  escala,
  initialCelebracoesRecorrentes,
  initialCelebracoesEspeciais,
  todosMinistrosAtivos,
}: EscalaDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'recorrentes' | 'especiais'>('recorrentes');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'TODAS' | CategoriaMissa>('TODAS');
  const [recorrentes, setRecorrentes] = useState(initialCelebracoesRecorrentes);
  const [especiais, setEspeciais] = useState(initialCelebracoesEspeciais);
  const [searchTerm, setSearchTerm] = useState('');

  // Modais de criação
  const [isNovaRecorrenteOpen, setIsNovaRecorrenteOpen] = useState(false);
  const [isNovaEspecialOpen, setIsNovaEspecialOpen] = useState(false);

  // Estados de loading e seleção para ações
  const [selectedMinistroMap, setSelectedMinistroMap] = useState<Record<string, string>>({});
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Total de vagas ocupadas
  const totalMinistrosEscalados =
    recorrentes.reduce((acc, c) => acc + c.ministros.length, 0) +
    especiais.reduce((acc, c) => acc + c.ministros.length, 0);

  // Categorização das celebrações recorrentes
  const manhaList = recorrentes.filter(
    (c) => classifyCelebration(c.dia_semana, c.horario) === 'MANHA'
  );
  const noiteList = recorrentes.filter(
    (c) => classifyCelebration(c.dia_semana, c.horario) === 'NOITE'
  );
  const diariaList = recorrentes.filter(
    (c) => classifyCelebration(c.dia_semana, c.horario) === 'DIARIA'
  );

  // Filtro de busca aplicado
  const filterList = (list: CelebracaoRecorrenteComMinistros[]) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((cr) => {
      const matchesDesc = cr.descricao.toLowerCase().includes(term);
      const matchesDia = DIAS_DA_SEMANA[cr.dia_semana]?.toLowerCase().includes(term);
      const matchesMinistro = cr.ministros.some((m) =>
        m.ministro.nome.toLowerCase().includes(term)
      );
      return matchesDesc || matchesDia || matchesMinistro;
    });
  };

  // Filtro de celebrações especiais
  const filteredEspeciais = especiais.filter((ce) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesDesc = ce.descricao.toLowerCase().includes(term);
    const matchesData = formatDateBR(ce.data).includes(term);
    const matchesMinistro = ce.ministros.some((m) =>
      m.ministro.nome.toLowerCase().includes(term)
    );
    return matchesDesc || matchesData || matchesMinistro;
  });

  // Ajustar o horário de todas as celebrações especiais para 15:00
  const handleAjustarTodasEspeciaisPara15h = async () => {
    if (
      !confirm(
        'Deseja realmente atualizar o horário de todas as celebrações especiais desta escala para 15:00?'
      )
    ) {
      return;
    }

    try {
      setLoadingActionId('ajustar-especiais-15h');
      const supabase = createClient();

      const { error } = await supabase
        .from('celebracoes_especiais')
        .update({ horario: '15:00:00' })
        .eq('escala_id', escala.id);

      if (error) {
        alert(`Erro ao atualizar horários: ${error.message}`);
        return;
      }

      setEspeciais((prev) =>
        prev.map((esp) => ({
          ...esp,
          horario: '15:00:00',
        }))
      );
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar horários');
    } finally {
      setLoadingActionId(null);
    }
  };

  // Alterar horário de uma celebração especial individual
  const handleAtualizarHorarioEspecial = async (
    celebracaoId: string,
    novoHorario: string
  ) => {
    try {
      setLoadingActionId(`time-esp-${celebracaoId}`);
      const supabase = createClient();
      const formatted = novoHorario.length === 5 ? `${novoHorario}:00` : novoHorario;

      const { error } = await supabase
        .from('celebracoes_especiais')
        .update({ horario: formatted })
        .eq('id', celebracaoId);

      if (error) {
        alert(`Erro ao atualizar horário: ${error.message}`);
        return;
      }

      setEspeciais((prev) =>
        prev.map((esp) =>
          esp.id === celebracaoId ? { ...esp, horario: formatted } : esp
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar horário');
    } finally {
      setLoadingActionId(null);
    }
  };

  // Adicionar Ministro a Celebração Recorrente
  const handleAddMinistroRecorrente = async (celebracaoId: string) => {
    const ministroId = selectedMinistroMap[celebracaoId];
    if (!ministroId) return;

    try {
      setLoadingActionId(`add-rec-${celebracaoId}`);
      const supabase = createClient();
      const celebracao = recorrentes.find((c) => c.id === celebracaoId);
      const novaOrdem = (celebracao?.ministros.length ?? 0) + 1;

      const { data, error } = await supabase
        .from('celebracao_recorrente_ministros')
        .insert({
          celebracao_recorrente_id: celebracaoId,
          ministro_id: ministroId,
          ordem: novaOrdem,
        })
        .select('id, ordem')
        .single();

      if (error) {
        alert(`Erro ao adicionar ministro: ${error.message}`);
        return;
      }

      const ministroInfo = todosMinistrosAtivos.find((m) => m.id === ministroId);
      if (ministroInfo && data) {
        const novoVinculo: MinistroVinculo = {
          vinculoId: data.id,
          ordem: data.ordem,
          ministro: {
            id: ministroInfo.id,
            nome: ministroInfo.nome,
            telefone: ministroInfo.telefone,
            ativo: ministroInfo.ativo,
          },
        };

        setRecorrentes((prev) =>
          prev.map((cr) =>
            cr.id === celebracaoId
              ? { ...cr, ministros: [...cr.ministros, novoVinculo] }
              : cr
          )
        );

        setSelectedMinistroMap((prev) => ({ ...prev, [celebracaoId]: '' }));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao adicionar ministro');
    } finally {
      setLoadingActionId(null);
    }
  };

  // Remover Ministro de Celebração Recorrente
  const handleRemoveMinistroRecorrente = async (
    celebracaoId: string,
    vinculoId: string
  ) => {
    if (!confirm('Deseja realmente remover este ministro desta celebração?')) {
      return;
    }

    try {
      setLoadingActionId(`rem-rec-${vinculoId}`);
      const supabase = createClient();

      const { error } = await supabase
        .from('celebracao_recorrente_ministros')
        .delete()
        .eq('id', vinculoId);

      if (error) {
        alert(`Erro ao remover: ${error.message}`);
        return;
      }

      setRecorrentes((prev) =>
        prev.map((cr) =>
          cr.id === celebracaoId
            ? {
                ...cr,
                ministros: cr.ministros.filter((m) => m.vinculoId !== vinculoId),
              }
            : cr
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao remover ministro');
    } finally {
      setLoadingActionId(null);
    }
  };

  // Adicionar Ministro a Celebração Especial
  const handleAddMinistroEspecial = async (celebracaoId: string) => {
    const ministroId = selectedMinistroMap[celebracaoId];
    if (!ministroId) return;

    try {
      setLoadingActionId(`add-esp-${celebracaoId}`);
      const supabase = createClient();
      const celebracao = especiais.find((c) => c.id === celebracaoId);
      const novaOrdem = (celebracao?.ministros.length ?? 0) + 1;

      const { data, error } = await supabase
        .from('celebracao_especial_ministros')
        .insert({
          celebracao_especial_id: celebracaoId,
          ministro_id: ministroId,
          ordem: novaOrdem,
        })
        .select('id, ordem')
        .single();

      if (error) {
        alert(`Erro ao adicionar ministro: ${error.message}`);
        return;
      }

      const ministroInfo = todosMinistrosAtivos.find((m) => m.id === ministroId);
      if (ministroInfo && data) {
        const novoVinculo: MinistroVinculo = {
          vinculoId: data.id,
          ordem: data.ordem,
          ministro: {
            id: ministroInfo.id,
            nome: ministroInfo.nome,
            telefone: ministroInfo.telefone,
            ativo: ministroInfo.ativo,
          },
        };

        setEspeciais((prev) =>
          prev.map((ce) =>
            ce.id === celebracaoId
              ? { ...ce, ministros: [...ce.ministros, novoVinculo] }
              : ce
          )
        );

        setSelectedMinistroMap((prev) => ({ ...prev, [celebracaoId]: '' }));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao adicionar ministro');
    } finally {
      setLoadingActionId(null);
    }
  };

  // Remover Ministro de Celebração Especial
  const handleRemoveMinistroEspecial = async (
    celebracaoId: string,
    vinculoId: string
  ) => {
    if (!confirm('Deseja realmente remover este ministro desta celebração especial?')) {
      return;
    }

    try {
      setLoadingActionId(`rem-esp-${vinculoId}`);
      const supabase = createClient();

      const { error } = await supabase
        .from('celebracao_especial_ministros')
        .delete()
        .eq('id', vinculoId);

      if (error) {
        alert(`Erro ao remover: ${error.message}`);
        return;
      }

      setEspeciais((prev) =>
        prev.map((ce) =>
          ce.id === celebracaoId
            ? {
                ...ce,
                ministros: ce.ministros.filter((m) => m.vinculoId !== vinculoId),
              }
            : ce
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao remover ministro');
    } finally {
      setLoadingActionId(null);
    }
  };

  // Renderiza um Card de Celebração Recorrente
  const renderCelebracaoRecorrenteCard = (cr: CelebracaoRecorrenteComMinistros) => {
    const diaNome = DIAS_DA_SEMANA[cr.dia_semana];
    const ordinal =
      cr.dia_semana === 0 || cr.dia_semana === 6
        ? `${cr.ocorrencia_mes}º`
        : `${cr.ocorrencia_mes}ª`;
    const ocorrenciaTexto = `${ordinal} ${diaNome} do mês`;
    const formatHora = cr.horario.slice(0, 5);

    const ministrosJaNaCelebracao = new Set(
      cr.ministros.map((m) => m.ministro.id)
    );
    const ministrosCandidatos = todosMinistrosAtivos.filter(
      (m) => !ministrosJaNaCelebracao.has(m.id)
    );

    const isAdding = loadingActionId === `add-rec-${cr.id}`;
    const categoria = classifyCelebration(cr.dia_semana, cr.horario);

    const badgeCategoria = {
      MANHA: { label: 'Manhã', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
      NOITE: { label: 'Noite', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
      DIARIA: { label: 'Diária', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    }[categoria];

    return (
      <Card
        key={cr.id}
        className="border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <CardHeader className="pb-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base text-slate-900">
                {cr.descricao}
              </CardTitle>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeCategoria.bg}`}
              >
                {badgeCategoria.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-emerald-800 font-medium mt-1">
              <span className="flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5" />
                {ocorrenciaTexto}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {formatHora}
              </span>
            </div>
          </div>

          <Badge variant="neutral">{cr.ministros.length} ministros</Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-1.5 flex-1">
            {cr.ministros.length === 0 ? (
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-800 text-center">
                Nenhum ministro escalado para esta celebração.
              </div>
            ) : (
              cr.ministros
                .sort((a, b) => a.ordem - b.ordem)
                .map((m, index) => {
                  const isRemoving = loadingActionId === `rem-rec-${m.vinculoId}`;
                  return (
                    <div
                      key={m.vinculoId}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {m.ministro.nome}
                          </p>
                          {m.ministro.telefone && (
                            <p className="text-[10px] font-mono text-slate-500">
                              {formatPhoneNumber(m.ministro.telefone)}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        title="Remover ministro da celebração"
                        disabled={isRemoving}
                        onClick={() =>
                          handleRemoveMinistroRecorrente(cr.id, m.vinculoId)
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        {isRemoving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <select
              value={selectedMinistroMap[cr.id] || ''}
              onChange={(e) =>
                setSelectedMinistroMap((prev) => ({
                  ...prev,
                  [cr.id]: e.target.value,
                }))
              }
              className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="">+ Selecione um ministro...</option>
              {ministrosCandidatos.map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.nome}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedMinistroMap[cr.id] || isAdding}
              onClick={() => handleAddMinistroRecorrente(cr.id)}
              className="text-xs h-8 px-3"
            >
              {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com Navegação e Resumo */}
      <div>
        <Link
          href="/escalas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Escalas Anuais
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {escala.nome}
              </h1>
              {escala.ativa ? (
                <Badge variant="success">Em Vigor</Badge>
              ) : (
                <Badge variant="neutral">Inativa</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Período de vigência:{' '}
              <strong className="text-slate-700 font-semibold">
                {formatDateBR(escala.data_inicio)}
              </strong>{' '}
              até{' '}
              <strong className="text-slate-700 font-semibold">
                {formatDateBR(escala.data_fim)}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-slate-700 block">
                {recorrentes.length + especiais.length} celebrações
              </span>
              <span className="text-[11px] text-slate-500">
                {totalMinistrosEscalados} vínculos de ministros
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Abas Principais (Recorrentes vs Especiais) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('recorrentes')}
            className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'recorrentes'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Missas Recorrentes</span>
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full ${
                activeTab === 'recorrentes'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {recorrentes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('especiais')}
            className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'especiais'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Missas Especiais</span>
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full ${
                activeTab === 'especiais'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {especiais.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar missa ou ministro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            />
          </div>

          {activeTab === 'recorrentes' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNovaRecorrenteOpen(true)}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Missa</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNovaEspecialOpen(true)}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Especial</span>
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo da Aba 1: Celebrações Recorrentes com Divisão por Turno */}
      {activeTab === 'recorrentes' && (
        <div className="space-y-6">
          {/* Barra de Filtro de Turnos / Categorias */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl max-w-fit">
            <button
              type="button"
              onClick={() => setCategoriaFiltro('TODAS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                categoriaFiltro === 'TODAS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas as Missas ({recorrentes.length})
            </button>

            <button
              type="button"
              onClick={() => setCategoriaFiltro('MANHA')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoriaFiltro === 'MANHA'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Missas da Manhã ({manhaList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoriaFiltro('NOITE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoriaFiltro === 'NOITE'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Missas da Noite ({noiteList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoriaFiltro('DIARIA')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoriaFiltro === 'DIARIA'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Missas Diárias ({diariaList.length})</span>
            </button>
          </div>

          {/* SEÇÃO: MISSAS DA MANHÃ */}
          {(categoriaFiltro === 'TODAS' || categoriaFiltro === 'MANHA') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-amber-200/80">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Sun className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Missas da Manhã (Domingo às 08:00)
                </h3>
                <Badge variant="warning">{manhaList.length} missas</Badge>
              </div>

              {filterList(manhaList).length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-lg">
                  Nenhuma missa da manhã cadastrada.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filterList(manhaList).map(renderCelebracaoRecorrenteCard)}
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO: MISSAS DA NOITE */}
          {(categoriaFiltro === 'TODAS' || categoriaFiltro === 'NOITE') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-indigo-200/80">
                <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                  <Moon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Missas da Noite (Domingo às 19:00)
                </h3>
                <Badge variant="info">{noiteList.length} missas</Badge>
              </div>

              {filterList(noiteList).length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-lg">
                  Nenhuma missa da noite cadastrada.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filterList(noiteList).map(renderCelebracaoRecorrenteCard)}
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO: MISSAS DIÁRIAS */}
          {(categoriaFiltro === 'TODAS' || categoriaFiltro === 'DIARIA') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-200/80">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Missas Diárias (Durante a Semana - Seg a Sáb)
                </h3>
                <Badge variant="success">{diariaList.length} missas</Badge>
              </div>

              {filterList(diariaList).length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-lg">
                  Nenhuma missa diária cadastrada.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filterList(diariaList).map(renderCelebracaoRecorrenteCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Celebrações Especiais com Ajuste para 15h */}
      {activeTab === 'especiais' && (
        <div className="space-y-4">
          {/* Barra de Ação Rápida para Missas Especiais */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-purple-50/80 border border-purple-200/80 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-purple-700 shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-950">
                  Horário Padrão das Celebrações Especiais
                </p>
                <p className="text-[11px] text-purple-700">
                  Você pode ajustar o horário de todas as missas especiais para 15:00 com um clique.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={
                loadingActionId === 'ajustar-especiais-15h' ||
                especiais.length === 0
              }
              onClick={handleAjustarTodasEspeciaisPara15h}
              className="border-purple-300 text-purple-800 hover:bg-purple-100 text-xs h-8"
            >
              {loadingActionId === 'ajustar-especiais-15h' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>Alterar todas para 15:00</span>
            </Button>
          </div>

          {filteredEspeciais.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="inline-flex p-3 rounded-full bg-purple-50 text-purple-600 mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Nenhuma celebração especial cadastrada
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? 'Nenhum resultado para a busca.'
                  : 'Cadastre missas pontuais por data fixa (ex: Solenidades, Missa ao Sagrado Coração às 15:00).'}
              </p>
              {!searchTerm && (
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsNovaEspecialOpen(true)}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Adicionar Primeira Celebração Especial
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEspeciais.map((ce) => {
                const ministrosJaNaCelebracao = new Set(
                  ce.ministros.map((m) => m.ministro.id)
                );
                const ministrosCandidatos = todosMinistrosAtivos.filter(
                  (m) => !ministrosJaNaCelebracao.has(m.id)
                );
                const isAdding = loadingActionId === `add-esp-${ce.id}`;
                const isUpdatingTime = loadingActionId === `time-esp-${ce.id}`;

                return (
                  <Card
                    key={ce.id}
                    className="border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3 bg-purple-50/30">
                      <div>
                        <CardTitle className="text-base text-slate-900">
                          {ce.descricao}
                        </CardTitle>
                        <div className="flex items-center gap-3 text-xs text-purple-900 font-medium mt-1">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                            {formatDateBR(ce.data)}
                          </span>

                          <div className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            <input
                              type="time"
                              defaultValue={ce.horario.slice(0, 5)}
                              disabled={isUpdatingTime}
                              onBlur={(e) => {
                                if (e.target.value && e.target.value !== ce.horario.slice(0, 5)) {
                                  handleAtualizarHorarioEspecial(ce.id, e.target.value);
                                }
                              }}
                              className="px-1.5 py-0.5 rounded border border-purple-200 bg-white text-xs font-mono font-bold text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                              title="Clique para alterar o horário desta celebração"
                            />
                            {ce.horario.slice(0, 5) !== '15:00' && (
                              <button
                                type="button"
                                onClick={() => handleAtualizarHorarioEspecial(ce.id, '15:00')}
                                title="Definir para 15:00"
                                className="text-[10px] font-sans font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                Mudar p/ 15h
                              </button>
                            )}
                          </div>
                        </div>

                        {ce.observacoes && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            {ce.observacoes}
                          </p>
                        )}
                      </div>

                      <Badge variant="info">
                        {ce.ministros.length} ministros
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5 flex-1">
                        {ce.ministros.length === 0 ? (
                          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-500 text-center">
                            Nenhum ministro escalado para esta celebração especial.
                          </div>
                        ) : (
                          ce.ministros
                            .sort((a, b) => a.ordem - b.ordem)
                            .map((m, index) => {
                              const isRemoving =
                                loadingActionId === `rem-esp-${m.vinculoId}`;
                              return (
                                <div
                                  key={m.vinculoId}
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold shrink-0">
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-slate-900 truncate">
                                        {m.ministro.nome}
                                      </p>
                                      {m.ministro.telefone && (
                                        <p className="text-[10px] font-mono text-slate-500">
                                          {formatPhoneNumber(m.ministro.telefone)}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    title="Remover ministro da celebração especial"
                                    disabled={isRemoving}
                                    onClick={() =>
                                      handleRemoveMinistroEspecial(
                                        ce.id,
                                        m.vinculoId
                                      )
                                    }
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  >
                                    {isRemoving ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              );
                            })
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <select
                          value={selectedMinistroMap[ce.id] || ''}
                          onChange={(e) =>
                            setSelectedMinistroMap((prev) => ({
                              ...prev,
                              [ce.id]: e.target.value,
                            }))
                          }
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-600"
                        >
                          <option value="">+ Selecione um ministro...</option>
                          {ministrosCandidatos.map((cand) => (
                            <option key={cand.id} value={cand.id}>
                              {cand.nome}
                            </option>
                          ))}
                        </select>

                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!selectedMinistroMap[ce.id] || isAdding}
                          onClick={() => handleAddMinistroEspecial(ce.id)}
                          className="text-xs h-8 px-3"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Adicionar</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <NovaCelebracaoModal
        escalaId={escala.id}
        isOpen={isNovaRecorrenteOpen}
        onClose={() => setIsNovaRecorrenteOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <NovaCelebracaoEspecialModal
        escalaId={escala.id}
        isOpen={isNovaEspecialOpen}
        onClose={() => setIsNovaEspecialOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
