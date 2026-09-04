'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ministro } from '@/types/database.types';
import { ministroSchema } from '@/lib/validations/ministro';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { UserCheck, MessageSquare, CalendarDays, ExternalLink } from 'lucide-react';

export interface MinistroVinculoEscala {
  tipo: 'RECORRENTE' | 'ESPECIAL';
  categoria?: 'MANHA' | 'NOITE' | 'DIARIA';
  escalaId: string;
  escalaNome: string;
  escalaAtiva: boolean;
  celebracaoDescricao: string;
  detalheHorario: string;
}

interface MinistroFormProps {
  ministro?: Ministro;
  vinculos?: MinistroVinculoEscala[];
}

export function MinistroForm({ ministro, vinculos = [] }: MinistroFormProps) {
  const router = useRouter();
  const isEditing = Boolean(ministro);

  const [nome, setNome] = useState(ministro?.nome ?? '');
  const [telefone, setTelefone] = useState(ministro?.telefone ?? '');
  const [ativo, setAtivo] = useState(ministro?.ativo ?? true);

  const [errors, setErrors] = useState<{ nome?: string; telefone?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const result = ministroSchema.safeParse({ nome, telefone, ativo });
    if (!result.success) {
      const fieldErrors: { nome?: string; telefone?: string } = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0] === 'nome') fieldErrors.nome = issue.message;
        if (issue.path[0] === 'telefone') fieldErrors.telefone = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      if (isEditing && ministro) {
        const { error } = await supabase
          .from('ministros')
          .update({
            nome: result.data.nome,
            telefone: result.data.telefone,
            ativo: result.data.ativo,
          })
          .eq('id', ministro.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ministros')
          .insert({
            nome: result.data.nome,
            telefone: result.data.telefone,
            ativo: result.data.ativo,
          });

        if (error) throw error;
      }

      router.push('/ministros');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar ministro';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      {/* Coluna do Formulário de Dados */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>
              {isEditing ? 'Editar Ministro' : 'Novo Ministro'}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? 'Atualize os dados e o status de disponibilidade do ministro.'
                : 'Informe os dados para cadastrar um novo ministro na comunidade.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {serverError && (
            <div className="mb-5">
              <Alert variant="danger">{serverError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="nome"
              label="Nome Completo *"
              placeholder="Ex: Alexandre da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              autoFocus
            />

            <div className="space-y-1.5">
              <Input
                id="telefone"
                label="Telefone / Celular (WhatsApp)"
                placeholder="Ex: 11999998888"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                error={errors.telefone}
                helperText="Informe com DDD (apenas números ou com formatação padrão)."
              />
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Este número será utilizado futuramente para envio automático dos lembretes de escala.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Ministro Ativo na Escala
                  </span>
                  <span className="text-slate-500">
                    Desmarque caso o ministro esteja afastado temporariamente ou inativo.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link href="/ministros">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
              >
                <UserCheck className="w-4 h-4" />
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Ministro'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Coluna de Vínculos nas Escalas (Apenas na edição) */}
      {isEditing && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-700" />
                <CardTitle className="text-sm">Onde este Ministro Serve</CardTitle>
              </div>
              <Badge variant={vinculos.length > 0 ? 'success' : 'neutral'}>
                {vinculos.length} {vinculos.length === 1 ? 'missa' : 'missas'}
              </Badge>
            </CardHeader>

            <CardContent className="p-4">
              {vinculos.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 text-center border border-slate-200/60">
                  <p className="text-xs font-semibold text-slate-700">
                    Sem escala atribuída
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Este ministro ainda não foi vinculado a nenhuma celebração recorrente ou especial.
                  </p>
                  <div className="mt-3">
                    <Link href="/escalas">
                      <Button variant="outline" size="sm" className="text-xs w-full">
                        Ir para Escalas Anuais
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {vinculos.map((v, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-slate-200/80 bg-white hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 block">
                          {v.celebracaoDescricao}
                        </span>
                        {v.tipo === 'ESPECIAL' ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200">
                            Especial
                          </span>
                        ) : v.categoria === 'MANHA' ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                            Missa da Manhã
                          </span>
                        ) : v.categoria === 'NOITE' ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-800 border-indigo-200">
                            Missa da Noite
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                            Missa Diária
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-emerald-800 font-medium">
                        {v.detalheHorario}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        <span>{v.escalaNome}</span>
                        <Link
                          href={`/escalas/${v.escalaId}`}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                        >
                          <span>Ver escala</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
