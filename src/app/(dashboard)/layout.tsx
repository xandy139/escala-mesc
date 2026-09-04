import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MESC Santa Cruz - Gestão de Escalas',
  description: 'Sistema administrativo de gestão de escalas da Comunidade Santa Cruz',
};

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch (err) {
    console.error('Erro ao carregar usuário:', err);
  }

  return (
    <DashboardShell userEmail={userEmail}>
      {children}
    </DashboardShell>
  );
}
