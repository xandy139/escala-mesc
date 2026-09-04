'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { X, Sparkles } from 'lucide-react';

interface NovaCelebracaoEspecialModalProps {
  escalaId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NovaCelebracaoEspecialModal({
  escalaId,
  isOpen,
  onClose,
  onSuccess,
}: NovaCelebracaoEspecialModalProps) {
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('15:00');
  const [observacoes, setObservacoes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!descricao.trim()) {
      setError('A descrição da celebração é obrigatória.');
      return;
    }

    if (!data) {
      setError('A data da celebração é obrigatória.');
      return;
    }

    if (!horario) {
      setError('O horário é obrigatório.');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      const { error: insertErr } = await supabase
        .from('celebracoes_especiais')
        .insert({
          escala_id: escalaId,
          descricao: descricao.trim(),
          data,
          horario: horario.length === 5 ? `${horario}:00` : horario,
          observacoes: observacoes.trim() || null,
        });

      if (insertErr) throw insertErr;

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar celebração especial';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Nova Celebração Especial
              </h3>
              <p className="text-xs text-slate-500">
                Celebração pontual cadastrada por data fixa
              </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Input
            id="descEsp"
            label="Nome da Celebração Especial *"
            placeholder="Ex: Missa ao Sagrado Coração de Jesus"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="dataEsp"
              type="date"
              label="Data da Missa *"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />

            <Input
              id="horaEsp"
              type="time"
              label="Horário *"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Primeira sexta-feira do mês ou solenidade"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Salvar Celebração Especial
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
