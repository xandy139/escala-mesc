'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { escalaSchema } from '@/lib/validations/escala';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { CalendarCheck } from 'lucide-react';

export function EscalaForm() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [nome, setNome] = useState(`Escala MESC ${currentYear}`);
  const [dataInicio, setDataInicio] = useState(`${currentYear}-01-01`);
  const [dataFim, setDataFim] = useState(`${currentYear}-12-31`);
  const [ativa, setAtiva] = useState(true);

  const [errors, setErrors] = useState<{
    nome?: string;
    data_inicio?: string;
    data_fim?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const result = escalaSchema.safeParse({
      nome,
      data_inicio: dataInicio,
      data_fim: dataFim,
      ativa,
    });

    if (!result.success) {
      const fieldErrors: {
        nome?: string;
        data_inicio?: string;
        data_fim?: string;
      } = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0] === 'nome') fieldErrors.nome = issue.message;
        if (issue.path[0] === 'data_inicio') fieldErrors.data_inicio = issue.message;
        if (issue.path[0] === 'data_fim') fieldErrors.data_fim = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      if (ativa) {
        // Desativa outras escalas caso esta esteja sendo ativada
        await supabase
          .from('escalas')
          .update({ ativa: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await supabase.from('escalas').insert({
        nome: result.data.nome,
        data_inicio: result.data.data_inicio,
        data_fim: result.data.data_fim,
        ativa: result.data.ativa,
      });

      if (error) throw error;

      router.push('/escalas');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar escala';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div>
          <CardTitle>Nova Escala Anual</CardTitle>
          <CardDescription>
            Defina o nome de identificação e o período de vigência anual da escala.
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
            label="Nome da Escala *"
            placeholder="Ex: Escala MESC 2026"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            error={errors.nome}
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="data_inicio"
              type="date"
              label="Data Inicial da Vigência *"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              error={errors.data_inicio}
            />

            <Input
              id="data_fim"
              type="date"
              label="Data Final da Vigência *"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              error={errors.data_fim}
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={ativa}
                onChange={(e) => setAtiva(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">
                  Definir como escala ativa agora
                </span>
                <span className="text-slate-500">
                  Ao marcar, as outras escalas existentes serão desmarcadas como vigentes.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link href="/escalas">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              <CalendarCheck className="w-4 h-4" />
              Criar Escala
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
