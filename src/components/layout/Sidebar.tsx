'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Calendar,
  Repeat,
  MessageSquare,
  History,
  Settings,
} from 'lucide-react';

export const navigationItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    active: true,
  },
  {
    name: 'Ministros',
    href: '/ministros',
    icon: Users,
    active: true,
  },
  {
    name: 'Escalas Anuais',
    href: '/escalas',
    icon: CalendarDays,
    active: true,
  },
  {
    name: 'Calendário',
    href: '/calendario',
    icon: Calendar,
    active: true,
  },
  {
    name: 'Exceções & Trocas',
    href: '/excecoes',
    icon: Repeat,
    active: true,
  },
  {
    name: 'WhatsApp',
    href: '/whatsapp',
    icon: MessageSquare,
    active: true,
  },
  {
    name: 'Histórico',
    href: '#',
    icon: History,
    active: false,
    badge: 'Em breve',
  },
  {
    name: 'Configurações',
    href: '#',
    icon: Settings,
    active: false,
    badge: 'Em breve',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 bg-slate-50/50 min-h-[calc(100vh-4rem)] p-4 shrink-0">
      <nav className="space-y-1.5 flex-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Navegação
        </p>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isCurrent =
            item.active &&
            (item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href));

          if (!item.active) {
            return (
              <div
                key={item.name}
                className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-400 cursor-not-allowed select-none opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-medium bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isCurrent
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isCurrent ? 'text-white' : 'text-slate-500'
                  )}
                />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-200/60 mt-auto">
        <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-lg">
          <p className="text-xs font-semibold text-emerald-900">Comunidade Santa Cruz</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            Coordenação MESC
          </p>
        </div>
      </div>
    </aside>
  );
}
