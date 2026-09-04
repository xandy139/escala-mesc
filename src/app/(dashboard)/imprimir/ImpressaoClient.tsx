'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Escala, Ministro, ExcecaoEscala } from '@/types/database.types';
import {
  CelebracaoRecorrenteCompleta,
  CelebracaoEspecialCompleta,
} from '@/types/domain';
import { resolveScheduleForDate } from '@/lib/domain/schedule-resolver';
import { Button } from '@/components/ui/Button';
import { formatDateBR } from '@/lib/utils';
import { ArrowLeft, Printer, Calendar } from 'lucide-react';

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

interface ImpressaoClientProps {
  escalaAtiva: Escala | null;
  celebracoesRecorrentes: CelebracaoRecorrenteCompleta[];
  celebracoesEspeciais: CelebracaoEspecialCompleta[];
  excecoes: ExcecaoEscala[];
  todosMinistrosAtivos: Ministro[];
}

export function ImpressaoClient({
  escalaAtiva,
  celebracoesRecorrentes,
  celebracoesEspeciais,
  excecoes,
  todosMinistrosAtivos,
}: ImpressaoClientProps) {
  const hoje = new Date();
  const defaultYear = escalaAtiva
    ? parseInt(escalaAtiva.data_inicio.slice(0, 4), 10)
    : hoje.getFullYear();
  const defaultMonth = escalaAtiva
    ? Math.max(0, parseInt(escalaAtiva.data_inicio.slice(5, 7), 10) - 1)
    : hoje.getMonth();

  const [ano, setAno] = useState(defaultYear);
  const [mes, setMes] = useState(defaultMonth);

  const ministrosMap: Record<string, Ministro> = {};
  todosMinistrosAtivos.forEach((m) => {
    ministrosMap[m.id] = m;
  });

  // Dias do mês selecionado
  const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diasDoMes = Array.from({ length: totalDiasNoMes }, (_, i) => {
    const diaNum = i + 1;
    const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(
      diaNum
    ).padStart(2, '0')}`;

    if (!escalaAtiva) return null;

    const resolved = resolveScheduleForDate({
      date: dateStr,
      escala: escalaAtiva,
      celebracoesRecorrentes,
      celebracoesEspeciais,
      excecoes,
      ministrosCadastrados: ministrosMap,
    });

    return resolved.celebracoes.length > 0 ? resolved : null;
  }).filter((d) => d !== null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controles no topo (Ocultos na impressão) */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Link>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800"
            >
              {MESES.map((nome, idx) => (
                <option key={idx} value={idx}>
                  {nome}
                </option>
              ))}
            </select>

            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800"
            >
              {[ano - 1, ano, ano + 1].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button variant="primary" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Escala (A4) / Salvar PDF
        </Button>
      </div>

      {/* Folha de Impressão Formatada */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200/90 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 text-slate-900 max-w-4xl mx-auto">
        {/* Cabeçalho da Folha */}
        <div className="text-center pb-6 border-b-2 border-slate-800 space-y-1">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-500">
            Comunidade Santa Cruz
          </p>
          <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
            Escala dos Ministros Extraordinários da Sagrada Comunhão (MESC)
          </h1>
          <p className="text-sm font-semibold text-slate-700">
            {MESES[mes]} de {ano} • {escalaAtiva ? escalaAtiva.nome : 'Escala Anual'}
          </p>
        </div>

        {/* Tabela de Missas e Ministros */}
        <div className="mt-6">
          {diasDoMes.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12 italic">
              Nenhuma celebração agendada para este mês na escala ativa.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2.5 border border-slate-300 w-28">Data</th>
                    <th className="p-2.5 border border-slate-300 w-32">Dia da Semana</th>
                    <th className="p-2.5 border border-slate-300 w-20">Horário</th>
                    <th className="p-2.5 border border-slate-300 w-44">Celebração</th>
                    <th className="p-2.5 border border-slate-300">Ministros Escalados</th>
                  </tr>
                </thead>
                <tbody>
                  {diasDoMes.map((dia) =>
                    dia!.celebracoes.map((cel, idx) => (
                      <tr
                        key={`${dia!.data}-${cel.celebracaoId}`}
                        className={`border-b border-slate-300 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="p-2.5 border border-slate-300 font-semibold whitespace-nowrap">
                          {formatDateBR(dia!.data)}
                        </td>
                        <td className="p-2.5 border border-slate-300">
                          {dia!.nomeDiaDaSemana}
                        </td>
                        <td className="p-2.5 border border-slate-300 font-mono font-bold">
                          {cel.horario.slice(0, 5)}
                        </td>
                        <td className="p-2.5 border border-slate-300 font-medium">
                          {cel.descricao}
                        </td>
                        <td className="p-2.5 border border-slate-300">
                          {cel.ministros.length === 0 ? (
                            <span className="text-slate-400 italic">
                              Sem ministros escalados
                            </span>
                          ) : (
                            <ol className="list-decimal list-inside space-y-0.5">
                              {cel.ministros.map((m) => (
                                <li key={m.id} className="font-medium">
                                  {m.nome}
                                  {m.isSubstituto && (
                                    <span className="text-[10px] font-bold text-slate-700 ml-1">
                                      *(Substituto de {m.ministroOriginalNome})*
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé da Sacristia */}
        <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-800 mb-2">Instruções para os Ministros:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
              <li>Chegar com antecedência mínima de 15 a 20 minutos antes da celebração.</li>
              <li>Em caso de imprevisto ou necessidade de substituição, avisar a coordenação no grupo.</li>
              <li>Revisar a alfaias e o número de partículas antes de iniciar a celebração.</li>
            </ul>
          </div>

          <div className="text-right flex flex-col justify-end">
            <div className="border-b border-slate-400 w-48 ml-auto mb-1"></div>
            <p className="text-[10px] text-slate-500 font-semibold">
              Coordenação MESC • Comunidade Santa Cruz
            </p>
            <p className="text-[9px] text-slate-400">
              Documento gerado automaticamente em {formatDateBR(hoje.toISOString().split('T')[0])}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
