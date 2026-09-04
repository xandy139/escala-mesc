import React from 'react';
import { EscalaForm } from '@/components/forms/EscalaForm';

export default function NovaEscalaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Cadastrar Nova Escala Anual
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Crie o registro de vigência anual para definir celebrações e ministros.
        </p>
      </div>

      <EscalaForm />
    </div>
  );
}
