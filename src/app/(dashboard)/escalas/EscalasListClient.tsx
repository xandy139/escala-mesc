'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Escala } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { formatDateBR } from '@/lib/utils';
import {
  CalendarDays,
  PlusCircle,
  CalendarCheck,
  CalendarX,
  Loader2,
  Copy,
} from 'lucide-react';

interface EscalasListClientProps {
  initialEscalas: Escala[];
}

export function EscalasListClient({ initialEscalas }: EscalasListClientProps) {
  const router = useRouter();
  const [escalas, setEscalas] = useState<Escala[]>(initialEscalas);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const handleToggleAtiva = async (escala: Escala) => {
    try {
      setActivatingId(escala.id);
      const novoStatus = !escala.ativa;
      const supabase = createClient();

      if (novoStatus) {
        // Ao ativar uma escala, desativa as demais para manter consistência
        await supabase
          .from('escalas')
          .update({ ativa: false })
          .neq('id', escala.id);
      }

      const { error } = await supabase
        .from('escalas')
        .update({ ativa: novoStatus })
        .eq('id', escala.id);

      if (error) {
        alert(`Erro ao alterar escala ativa: ${error.message}`);
        return;
      }

      setEscalas((prev) =>
        prev.map((item) => {
          if (item.id === escala.id) {
            return { ...item, ativa: novoStatus };
          }
          // Se estamos ativando a atual, desativa as outras
          return novoStatus ? { ...item, ativa: false } : item;
        })
      );
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      alert(msg);
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Gerencie os períodos das escalas anuais e defina qual está em vigor.
        </p>

        <Link href="/escalas/nova">
          <Button variant="primary" className="w-full sm:w-auto">
            <PlusCircle className="w-4 h-4" />
            Nova Escala Anual
          </Button>
        </Link>
      </div>

      {escalas.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            Nenhuma escala cadastrada
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Crie sua primeira escala anual (ex: Escala MESC 2026) para começar a vincular as missas e ministros.
          </p>
          <div className="mt-4">
            <Link href="/escalas/nova">
              <Button variant="primary" size="sm">
                <PlusCircle className="w-4 h-4" />
                Criar Escala Agora
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {escalas.map((escala) => {
            const isActivating = activatingId === escala.id;
            return (
              <Card
                key={escala.id}
                className={
                  escala.ativa
                    ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200/80 hover:border-slate-300'
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div>
                      <CardTitle className="text-base">{escala.nome}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Vigência: {formatDateBR(escala.data_inicio)} até {formatDateBR(escala.data_fim)}
                      </CardDescription>
                    </div>
                    {escala.ativa ? (
                      <Badge variant="success">Em Vigor</Badge>
                    ) : (
                      <Badge variant="neutral">Inativa</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-3 border-t border-slate-100 space-y-3">
                  <Link href={`/escalas/${escala.id}`} className="block">
                    <Button variant="primary" size="sm" className="w-full justify-between">
                      <span className="font-medium text-xs">Gerenciar Missas & Ministros</span>
                      <CalendarDays className="w-3.5 h-3.5" />
                    </Button>
                  </Link>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                    <Button
                      variant={escala.ativa ? 'outline' : 'secondary'}
                      size="sm"
                      disabled={isActivating}
                      onClick={() => handleToggleAtiva(escala)}
                      className={
                        escala.ativa
                          ? 'text-amber-700 hover:text-amber-800 text-xs py-1 h-8'
                          : 'text-emerald-700 hover:text-emerald-800 text-xs py-1 h-8'
                      }
                    >
                      {isActivating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : escala.ativa ? (
                        <CalendarX className="w-3.5 h-3.5" />
                      ) : (
                        <CalendarCheck className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {escala.ativa ? 'Desativar' : 'Definir Ativa'}
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title="Recurso de duplicar escala estará disponível nas próximas etapas"
                      className="text-slate-400 text-xs gap-1 opacity-60 h-8"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
