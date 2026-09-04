'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ministro } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatPhoneNumber } from '@/lib/utils';
import {
  UserPlus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  Phone,
  Users,
  Loader2,
  CalendarDays,
} from 'lucide-react';

interface MinistrosListClientProps {
  initialMinistros: Ministro[];
  vinculosCountMap?: Record<string, number>;
  activeScaleNome?: string | null;
}

export function MinistrosListClient({
  initialMinistros,
  vinculosCountMap = {},
  activeScaleNome,
}: MinistrosListClientProps) {
  const router = useRouter();
  const [ministros, setMinistros] = useState<Ministro[]>(initialMinistros);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredMinistros = ministros.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesName = m.nome.toLowerCase().includes(term);
    const matchesPhone = m.telefone ? m.telefone.includes(term) : false;
    return matchesName || matchesPhone;
  });

  const handleToggleAtivo = async (ministro: Ministro) => {
    try {
      setUpdatingId(ministro.id);
      const novoStatus = !ministro.ativo;
      const supabase = createClient();

      const { error } = await supabase
        .from('ministros')
        .update({ ativo: novoStatus })
        .eq('id', ministro.id);

      if (error) {
        alert(`Erro ao alterar status: ${error.message}`);
        return;
      }

      setMinistros((prev) =>
        prev.map((item) =>
          item.id === ministro.id ? { ...item, ativo: novoStatus } : item
        )
      );
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      alert(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de Ações do Topo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 transition-colors"
          />
        </div>

        <Link href="/ministros/novo">
          <Button variant="primary" className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4" />
            Cadastrar Ministro
          </Button>
        </Link>
      </div>

      {/* Tabela / Lista Responsiva */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredMinistros.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Nenhum ministro encontrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'Nenhum resultado corresponde à sua pesquisa. Tente outros termos.'
                : 'Nenhum ministro cadastrado ainda. Clique em "Cadastrar Ministro" para iniciar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Nome do Ministro
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Telefone
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Vínculo {activeScaleNome ? `(${activeScaleNome})` : 'na Escala'}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMinistros.map((ministro) => {
                  const isUpdating = updatingId === ministro.id;
                  const countNaEscala = vinculosCountMap[ministro.id] || 0;

                  return (
                    <tr
                      key={ministro.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {ministro.nome}
                      </td>
                      <td className="px-6 py-4">
                        {ministro.telefone ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {formatPhoneNumber(ministro.telefone)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Não informado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {countNaEscala > 0 ? (
                          <Link href={`/ministros/${ministro.id}`} title="Ver missas escaladas">
                            <Badge variant="success" className="cursor-pointer hover:bg-emerald-100">
                              <CalendarDays className="w-3 h-3" />
                              {countNaEscala} {countNaEscala === 1 ? 'missa' : 'missas'}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge variant="neutral">
                            Sem escala
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ministro.ativo ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="neutral">Inativo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => handleToggleAtivo(ministro)}
                          title={ministro.ativo ? 'Inativar ministro' : 'Ativar ministro'}
                          className={
                            ministro.ativo
                              ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
                              : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
                          }
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : ministro.ativo ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          <span className="text-xs">
                            {ministro.ativo ? 'Inativar' : 'Ativar'}
                          </span>
                        </Button>

                        <Link href={`/ministros/${ministro.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Editar dados e ver escalas"
                            className="text-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="text-xs">Detalhes</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
