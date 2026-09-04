import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { formatDateBR, formatPhoneNumber } from '@/lib/utils';
import { resolveScheduleForDate } from '@/lib/domain/schedule-resolver';
import { classifyCelebration } from '@/lib/domain/recurrence';
import {
  CelebracaoRecorrenteCompleta,
  CelebracaoEspecialCompleta,
  EscalaDoDiaResolvida,
} from '@/types/domain';
import { Ministro, ExcecaoEscala } from '@/types/database.types';
import {
  Users,
  CalendarDays,
  CalendarCheck2,
  ArrowRight,
  Sparkles,
  Printer,
  Repeat,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Clock,
  MessageSquare,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let activeMinistersCount = 0;
  let totalMinistersCount = 0;
  let totalExcecoesCount = 0;
  let hasSupabaseError = false;
  let errorMessage: string | null = null;

  const proximasMissas: EscalaDoDiaResolvida[] = [];

  const supabase = await createClient();

  // 1. Contagens
  const { count: activeCount, error: minActiveErr } = await supabase
    .from('ministros')
    .select('*', { count: 'exact', head: true })
    .eq('ativo', true);

  const { count: totalCount } = await supabase
    .from('ministros')
    .select('*', { count: 'exact', head: true });

  const { count: excecoesCount } = await supabase
    .from('excecoes_escala')
    .select('*', { count: 'exact', head: true });

  if (minActiveErr) {
    hasSupabaseError = true;
    errorMessage = minActiveErr.message;
  } else {
    activeMinistersCount = activeCount ?? 0;
    totalMinistersCount = totalCount ?? 0;
    totalExcecoesCount = excecoesCount ?? 0;
  }

  // 2. Escala ativa
  const { data: activeScale } = await supabase
    .from('escalas')
    .select('*')
    .eq('ativa', true)
    .maybeSingle();

  // 3. Se houver escala ativa, carrega regras e calcula próximas missas dos próximos 14 dias
  if (activeScale) {
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
      .eq('escala_id', activeScale.id)
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
      .eq('escala_id', activeScale.id);

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
      .eq('escala_id', activeScale.id);

    const excecoes: ExcecaoEscala[] = excData || [];

    const { data: minData } = await supabase
      .from('ministros')
      .select('*')
      .eq('ativo', true);

    const ministrosMap: Record<string, Ministro> = {};
    (minData || []).forEach((m) => {
      ministrosMap[m.id] = m;
    });

    // Projeta os próximos 14 dias a partir de hoje
    const hoje = new Date();
    // Se a escala ainda não começou, projeta a partir do primeiro dia da escala
    const escalaInicio = new Date(activeScale.data_inicio + 'T00:00:00');
    const dataBase = hoje < escalaInicio ? escalaInicio : hoje;

    for (let i = 0; i < 14; i++) {
      const dataIter = new Date(dataBase);
      dataIter.setDate(dataBase.getDate() + i);
      const y = dataIter.getFullYear();
      const m = String(dataIter.getMonth() + 1).padStart(2, '0');
      const d = String(dataIter.getDate()).padStart(2, '0');
      const isoStr = `${y}-${m}-${d}`;

      const resolved = resolveScheduleForDate({
        date: isoStr,
        escala: activeScale,
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

  return (
    <div className="space-y-8">
      {/* Header com Boas-Vindas e Ações Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Comunidade Santa Cruz
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centro de Comando da Escala dos Ministros Extraordinários da Sagrada Comunhão (MESC).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/imprimir">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir Mural da Sacristia</span>
            </Button>
          </Link>

          <Link href="/whatsapp">
            <Button variant="outline" size="sm" className="gap-1.5 text-emerald-800 border-emerald-300 hover:bg-emerald-50">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Avisos no WhatsApp</span>
            </Button>
          </Link>

          <Link href="/calendario">
            <Button variant="primary" size="sm" className="gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              <span>Abrir Calendário</span>
            </Button>
          </Link>
        </div>
      </div>

      {hasSupabaseError && (
        <Alert variant="warning" title="Aviso">
          Não foi possível carregar alguns dados do Supabase ({errorMessage}).
        </Alert>
      )}

      {/* Cartões de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ministros Ativos
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {activeMinistersCount}
                </span>
                <span className="text-xs text-slate-400">
                  de {totalMinistersCount} cadastrados
                </span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Escala em Vigor
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 truncate max-w-[140px]">
                  {activeScale ? activeScale.nome : 'Nenhuma ativa'}
                </span>
                {activeScale && (
                  <Badge variant="success" className="text-[10px] py-0">
                    Vigente
                  </Badge>
                )}
              </div>
              {activeScale && (
                <p className="text-[10px] text-slate-400 font-mono">
                  {formatDateBR(activeScale.data_inicio)} a {formatDateBR(activeScale.data_fim)}
                </p>
              )}
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
              <CalendarDays className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Próximas Celebrações
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {proximasMissas.reduce((acc, d) => acc + d.celebracoes.length, 0)}
                </span>
                <span className="text-xs text-slate-400">nos próximos 14 dias</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Trocas / Substituições
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {totalExcecoesCount}
                </span>
                <span className="text-xs text-slate-400">registradas</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
              <Repeat className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel: Próximas Missas a Acontecer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-800" />
            <h2 className="text-lg font-bold text-slate-900">
              Próximas Missas (Próximos 14 Dias)
            </h2>
          </div>

          <Link
            href="/calendario"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            <span>Ver calendário mensal completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {proximasMissas.length === 0 ? (
          <Card className="p-8 text-center">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhuma celebração agendada para os próximos 14 dias
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Consulte o calendário mensal ou ative a escala do ano corrente para ver as projeções.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proximasMissas.map((dia) =>
              dia.celebracoes.map((cel) => {
                const isEspecial = cel.tipo === 'ESPECIAL';
                const cat = isEspecial
                  ? null
                  : classifyCelebration(dia.diaDaSemana, cel.horario);

                const badgeConfig = isEspecial
                  ? { label: 'Especial', bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: Sparkles }
                  : cat === 'MANHA'
                  ? { label: 'Missa da Manhã', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Sun }
                  : cat === 'NOITE'
                  ? { label: 'Missa da Noite', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: Moon }
                  : { label: 'Missa Diária', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CalendarIcon };

                const IconComponent = badgeConfig.icon;

                return (
                  <Card
                    key={`${dia.data}-${cel.celebracaoId}`}
                    className="border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3 bg-slate-50/50">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeConfig.bg}`}
                          >
                            <IconComponent className="w-2.5 h-2.5" />
                            {badgeConfig.label}
                          </span>

                          <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {cel.horario.slice(0, 5)}
                          </span>
                        </div>

                        <CardTitle className="text-sm text-slate-900">
                          {cel.descricao}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {dia.nomeDiaDaSemana}, <strong>{formatDateBR(dia.data)}</strong>
                        </p>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Quem Serve ({cel.ministros.length}):
                        </p>

                        {cel.ministros.length === 0 ? (
                          <div className="p-2 bg-amber-50 border border-amber-200/60 rounded text-[11px] text-amber-800 italic">
                            Atenção: Nenhum ministro escalado para esta missa!
                          </div>
                        ) : (
                          cel.ministros.map((m, idx) => (
                            <div
                              key={m.id}
                              className={`flex items-center justify-between p-2 rounded text-xs ${
                                m.isSubstituto
                                  ? 'bg-amber-50/80 border border-amber-200 text-amber-950 font-semibold'
                                  : 'bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="truncate">{m.nome}</span>
                              </div>

                              {m.isSubstituto ? (
                                <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold shrink-0">
                                  Substituto
                                </span>
                              ) : m.telefone ? (
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {formatPhoneNumber(m.telefone)}
                                </span>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{dia.descricaoOcorrencia}</span>
                        <Link
                          href={`/calendario`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          Detalhes
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
