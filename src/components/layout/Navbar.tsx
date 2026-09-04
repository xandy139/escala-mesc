'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { LogOut, Menu, Church } from 'lucide-react';

interface NavbarProps {
  userEmail?: string | null;
  onOpenMobileMenu?: () => void;
}

export function Navbar({ userEmail, onOpenMobileMenu }: NavbarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-xs group-hover:bg-emerald-800 transition-colors">
            <Church className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-slate-900 block leading-tight text-sm sm:text-base">
              MESC Santa Cruz
            </span>
            <span className="text-[10px] text-slate-500 font-medium hidden sm:block">
              Gestão de Escalas Litúrgicas
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {userEmail && (
          <div className="hidden text-right md:block">
            <p className="text-xs font-medium text-slate-800">{userEmail}</p>
            <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
              Coordenação
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          isLoading={isLoggingOut}
          title="Sair do sistema"
          className="text-slate-600 hover:text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
