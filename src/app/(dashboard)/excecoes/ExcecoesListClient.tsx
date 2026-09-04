'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Escala, Ministro } from '@/types/database.types';
import { CelebracaoRecorrenteCompleta, CelebracaoEspecialCompleta } from '@/types/domain';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { formatDateBR } from '@/lib/utils';
import { NovaExcecaoModal } from './NovaExcecaoModal';
import {
  Repeat,
  PlusCircle,
  Search,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';

export interface ExcecaoDetalhada {
  id: string;
  data: string;
  motivo: string | null;
  escala: {
    id: string;
    nome: string;
  };
  celebracaoNome: string;
  horario: string;
  ministroOriginal: {
    id: string;
    nome: string;
    telefone: string | null;
  };
  ministroSubstituto: {
    id: string;
    nome: string;
    telefone: string | null;
  } | null;
}

interface ExcecoesListClientProps {
  initialExcecoes: ExcecaoDetalhada[];
  escalaAtiva: Escala | null;
  celebracoesRecorrentes: CelebracaoRecorrenteCompleta[];
  celebracoesEspeciais: CelebracaoEspecialCompleta[];
  todosMinistrosAtivos: Ministro[];
}

export function ExcecoesListClient({
  initialExcecoes,
  escalaAtiva,
  celebracoesRecorrentes,
  celebracoesEspeciais,
  todosMinistrosAtivos,
}: ExcecoesListClientProps) {
  const router = useRouter();
  const [excecoes, setExcecoes] = useState<ExcecaoDetalhada[]>(initialExcecoes);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNovaExcecaoOpen, setIsNovaExcecaoOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredExcecoes = excecoes.filter((exc) => {
    const term = searchTerm.toLowerCase();
    const dataBR = formatDateBR(exc.data);
    const origNome = exc.ministroOriginal.nome.toLowerCase();
    const substNome = exc.ministroSubstituto?.nome.toLowerCase() || '';
    const celNome = exc.celebracaoNome.toLowerCase();
    const mot = exc.motivo?.toLowerCase() || '';

    return (
      dataBR.includes(term) ||
      origNome.includes(term) ||
      substNome.includes(term) ||
      celNome.includes(term) ||
      mot.includes(term)
    );
  });

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Deseja reverter esta substituição? O ministro titular original voltará a constar na escala desta data.'
      )
    ) {
      return;
    }

    try {
      setDeletingId(id);
      const supabase = createClient();
      const { error } = await supabase
        .from('excecoes_escala')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Erro ao reverter substituição: ${error.message}`);
        return;
      }

      setExcecoes((prev) => prev.filter((e) => e.id !== id));
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao reverter substituição');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de Filtros e Ação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por data, ministro ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 transition-colors"
          />
        </div>

        <Button
          variant="primary"
          onClick={() => setIsNovaExcecaoOpen(true)}
          disabled={!escalaAtiva}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Registrar Substituição
        </Button>
      </div>

      {/* Tabela de Exceções */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredExcecoes.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
              <Repeat className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Nenhuma substituição ou exceção registrada
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'Nenhuma substituição encontrada para a busca.'
                : 'Quando um ministro precisar de um substituto pontual, registre aqui sem alterar a regra master anual.'}
            </p>
            {!searchTerm && escalaAtiva && (
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsNovaExcecaoOpen(true)}
                >
                  <PlusCircle className="w-4 h-4" />
                  Registrar Primeira Substituição
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Data da Missa
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Celebração / Horário
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Troca de Ministros
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Motivo
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExcecoes.map((exc) => {
                  const isDeleting = deletingId === exc.id;

                  return (
                    <tr
                      key={exc.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateBR(exc.data)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 text-xs">
                          {exc.celebracaoNome}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {exc.horario.slice(0, 5)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded font-medium line-through">
                            {exc.ministroOriginal.nome}
                          </span>

                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                          {exc.ministroSubstituto ? (
                            <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded font-semibold">
                              {exc.ministroSubstituto.nome}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded italic">
                              Ausência sem substituto
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                        {exc.motivo || <span className="text-slate-300">-</span>}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => handleDelete(exc.id)}
                          title="Reverter substituição"
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span className="text-xs">Reverter</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {escalaAtiva && (
        <NovaExcecaoModal
          escala={escalaAtiva}
          celebracoesRecorrentes={celebracoesRecorrentes}
          celebracoesEspeciais={celebracoesEspeciais}
          todosMinistrosAtivos={todosMinistrosAtivos}
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
