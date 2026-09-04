import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Church, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl mb-4">
        <Church className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Página Não Encontrada</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-sm">
        O endereço solicitado não existe ou você não possui permissão para acessá-lo.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="primary">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Button>
        </Link>
      </div>
    </div>
  );
}
