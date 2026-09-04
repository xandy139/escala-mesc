import React from 'react';
import { MinistroForm } from '@/components/forms/MinistroForm';

export default function NovoMinistroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Cadastrar Novo Ministro
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Adicione um novo Ministro Extraordinário da Sagrada Comunhão.
        </p>
      </div>

      <MinistroForm />
    </div>
  );
}
