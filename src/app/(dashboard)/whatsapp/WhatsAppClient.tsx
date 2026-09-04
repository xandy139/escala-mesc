'use client';

import React, { useState, useEffect, useMemo, useId, useSyncExternalStore } from 'react';
import { EscalaDoDiaResolvida } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { formatDateBR, formatPhoneNumber } from '@/lib/utils';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Users,
  Send,
  Loader2,
  RefreshCw,
  Clock,
  Info,
  LogOut,
  Settings,
  Zap,
} from 'lucide-react';

const emptySubscribe = () => () => {};

interface GroupInfo {
  id: string;
  subject: string;
  size: number;
}

interface WhatsAppStatusResponse {
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  hasSavedSession: boolean;
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastError: string | null;
}

interface WhatsAppClientProps {
  proximasMissas: EscalaDoDiaResolvida[];
}

export function WhatsAppClient({ proximasMissas }: WhatsAppClientProps) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const selectGrupoId = useId();
  const selectMissaId = useId();
  const textareaMensagemId = useId();
  const horarioDisparoId = useId();
  const ativarAgendadorId = useId();

  // Estados de conexão Baileys
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED');
  const [hasSavedSession, setHasSavedSession] = useState<boolean>(false);
  const [qrCodeImg, setQrCodeImg] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Estados dos grupos do WhatsApp
  const [grupos, setGrupos] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoadingGrupos, setIsLoadingGrupos] = useState(false);

  // Estados do disparo de lembrete manual
  const [userSelectedMissaKey, setUserSelectedMissaKey] = useState<string | null>(null);
  const [userEditedTexto, setUserEditedTexto] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'danger'; msg: string } | null>(null);

  // Estados do agendador automático diário (Lembrete da Véspera)
  const [autoReminderEnabled, setAutoReminderEnabled] = useState<boolean>(false);
  const [autoReminderTime, setAutoReminderTime] = useState<string>('20:00');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);
  const [isTestingTomorrow, setIsTestingTomorrow] = useState<boolean>(false);
  const [tomorrowFeedback, setTomorrowFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Monta lista plana de celebrações próximas
  const todasMissasProximas = useMemo(() => {
    return proximasMissas.flatMap((dia) =>
      dia.celebracoes.map((cel) => ({
        key: `${dia.data}_${cel.celebracaoId}`,
        data: dia.data,
        nomeDiaDaSemana: dia.nomeDiaDaSemana,
        descricaoOcorrencia: dia.descricaoOcorrencia,
        cel,
      }))
    );
  }, [proximasMissas]);

  // Celebração ativa (derivada de forma pura)
  const activeMissaKey =
    userSelectedMissaKey && todasMissasProximas.some((m) => m.key === userSelectedMissaKey)
      ? userSelectedMissaKey
      : todasMissasProximas.length > 0
      ? todasMissasProximas[0].key
      : '';

  const missaSelecionada = todasMissasProximas.find(
    (m) => m.key === activeMissaKey
  );

  // Monta o texto padrão do lembrete de forma pura e reativa (useMemo)
  const defaultTexto = useMemo(() => {
    if (!missaSelecionada) return '';

    const { data, nomeDiaDaSemana, cel } = missaSelecionada;
    const dataBR = formatDateBR(data);
    const hora = cel.horario.slice(0, 5);

    let ministrosTexto = '';
    cel.ministros.forEach((m, idx) => {
      const cleanPhone = m.telefone ? m.telefone.replace(/\D/g, '') : '';
      const phoneComPais = cleanPhone.startsWith('55')
        ? cleanPhone
        : cleanPhone.length >= 10
        ? `55${cleanPhone}`
        : cleanPhone;

      const mencaoTag = phoneComPais ? `@${phoneComPais}` : m.nome;
      const extraSubst = m.isSubstituto
        ? ` *(Substituto de ${m.ministroOriginalNome || 'titular'})*`
        : '';

      ministrosTexto += `${idx + 1}. ${mencaoTag} (${m.nome})${extraSubst}\n`;
    });

    return `🔔 *LEMBRETE DE ESCALA - COMUNIDADE SANTA CRUZ* 🔔\n\nCelebração: *${cel.descricao}*\n📅 Data: *${nomeDiaDaSemana}, ${dataBR}*\n⏰ Horário: *${hora}*\n\n*Ministros escalados:*\n${ministrosTexto || 'Nenhum ministro escalado.\n'}\nFavor chegar com *20 minutos de antecedência*. Em caso de necessidade de substituição, favor avisar previamente aqui no grupo.\n\n_Que Deus abençoe a todos e bom serviço ao altar!_ 🙏✨`;
  }, [missaSelecionada]);

  const textoExibido = userEditedTexto !== null ? userEditedTexto : defaultTexto;

  // Polling para checar status da conexão
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        if (res.ok && isMounted) {
          const data: WhatsAppStatusResponse = await res.json();
          setStatus(data.status);
          setHasSavedSession(Boolean(data.hasSavedSession));
          setQrCodeImg(data.qrCodeDataUrl);
          setConnectedPhone(data.connectedPhone);
        }
      } catch {
        // Ignora erros momentâneos
      }
    };

    const timer = setTimeout(checkStatus, 100);
    const interval = setInterval(checkStatus, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Carrega grupos do WhatsApp quando conectado
  useEffect(() => {
    let isMounted = true;
    if (status === 'CONNECTED') {
      const loadGroups = async () => {
        setIsLoadingGrupos(true);
        try {
          const res = await fetch('/api/whatsapp/groups');
          if (res.ok && isMounted) {
            const data = await res.json();
            setGrupos(data.groups || []);
          }
        } finally {
          if (isMounted) setIsLoadingGrupos(false);
        }
      };

      const timer = setTimeout(loadGroups, 400);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [status]);

  const handleManualFetchGroups = async () => {
    setIsLoadingGrupos(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      if (res.ok) {
        const data = await res.json();
        setGrupos(data.groups || []);
      }
    } finally {
      setIsLoadingGrupos(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setSendFeedback(null);
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
      const data = await res.json();
      setStatus(data.status);
      setQrCodeImg(data.qrCodeDataUrl);
    } catch (err: unknown) {
      setSendFeedback({
        type: 'danger',
        msg: err instanceof Error ? err.message : 'Falha ao iniciar conexão',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar o WhatsApp?')) return;

    try {
      setIsDisconnecting(true);
      await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      setStatus('DISCONNECTED');
      setQrCodeImg(null);
      setConnectedPhone(null);
      setGrupos([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Carrega configuração salva do lembrete diário no servidor e localStorage no cliente
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedGroup = localStorage.getItem('mesc_whatsapp_selected_group');
      if (savedGroup) {
        setSelectedGroupId(savedGroup);
      }
    }, 0);

    fetch('/api/whatsapp/reminder-config')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setAutoReminderEnabled(Boolean(data.enabled));
          if (data.time) setAutoReminderTime(data.time);
          if (data.groupId) {
            setSelectedGroupId((prev) => prev || data.groupId);
          }
        }
      })
      .catch(() => {});

    return () => clearTimeout(timer);
  }, []);

  const handleSaveReminderConfig = async () => {
    if (!selectedGroupId && autoReminderEnabled) {
      alert('Por favor, selecione um Grupo do WhatsApp antes de ativar o envio automático.');
      return;
    }

    try {
      setIsSavingConfig(true);
      setConfigFeedback(null);
      const res = await fetch('/api/whatsapp/reminder-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: autoReminderEnabled,
          time: autoReminderTime,
          groupId: selectedGroupId,
        }),
      });

      if (res.ok) {
        setConfigFeedback('Configurações do lembrete diário salvas com sucesso!');
        setTimeout(() => setConfigFeedback(null), 4000);
      } else {
        alert('Erro ao salvar configurações do agendador.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestTomorrow = async () => {
    if (!selectedGroupId) {
      alert('Selecione um grupo no painel acima antes de testar.');
      return;
    }

    try {
      setIsTestingTomorrow(true);
      setTomorrowFeedback(null);
      const res = await fetch('/api/whatsapp/send-tomorrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIdOverride: selectedGroupId }),
      });

      const data = await res.json();
      setTomorrowFeedback({
        success: data.success,
        msg: data.message || (data.success ? 'Envio de teste concluído!' : 'Falha no teste.'),
      });
    } catch (err: unknown) {
      setTomorrowFeedback({
        success: false,
        msg: err instanceof Error ? err.message : 'Erro ao disparar teste',
      });
    } finally {
      setIsTestingTomorrow(false);
    }
  };

  const handleSelectGroup = (gid: string) => {
    setSelectedGroupId(gid);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mesc_whatsapp_selected_group', gid);
    }
  };

  // Enviar a mensagem para o grupo
  const handleSendToGroup = async () => {
    if (!selectedGroupId) {
      alert('Por favor, selecione o Grupo do WhatsApp antes de enviar.');
      return;
    }

    if (!missaSelecionada) {
      alert('Selecione uma celebração.');
      return;
    }

    const mentions: string[] = [];
    missaSelecionada.cel.ministros.forEach((m) => {
      if (m.telefone) {
        const clean = m.telefone.replace(/\D/g, '');
        const phoneWithCountry = clean.startsWith('55')
          ? clean
          : clean.length >= 10
          ? `55${clean}`
          : clean;

        if (phoneWithCountry.length >= 10) {
          mentions.push(`${phoneWithCountry}@s.whatsapp.net`);
        }
      }
    });

    try {
      setIsSending(true);
      setSendFeedback(null);

      const res = await fetch('/api/whatsapp/send-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          text: textoExibido,
          mentions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao enviar mensagem');
      }

      setSendFeedback({
        type: 'success',
        msg: `Lembrete enviado com sucesso no grupo com marcação de ${mentions.length} ministro(s)!`,
      });
    } catch (err: unknown) {
      setSendFeedback({
        type: 'danger',
        msg: err instanceof Error ? err.message : 'Erro ao disparar mensagem',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Título e Subtítulo */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <MessageSquare className="w-6 h-6 text-emerald-700" />
          Avisos e Lembretes de Escala no WhatsApp (Baileys)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Envie os avisos de escala diretamente no Grupo dos Ministros com marcação e notificação individual (@).
        </p>
      </div>

      {sendFeedback && (
        <Alert variant={sendFeedback.type} title={sendFeedback.type === 'success' ? 'Sucesso' : 'Atenção'}>
          {sendFeedback.msg}
        </Alert>
      )}

      {/* Grid Principal: Conexão Baileys + Disparo em Grupo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Card de Conexão WhatsApp */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-700" />
                <CardTitle className="text-base">Conexão WhatsApp</CardTitle>
              </div>

              {status === 'CONNECTED' ? (
                <Badge variant="success">Conectado</Badge>
              ) : status === 'QR_READY' ? (
                <Badge variant="warning">Aguardando Leitura</Badge>
              ) : status === 'CONNECTING' ? (
                <Badge variant="info">Conectando...</Badge>
              ) : hasSavedSession ? (
                <Badge variant="info">Sessão Salva</Badge>
              ) : (
                <Badge variant="neutral">Desconectado</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-center">
            {status === 'CONNECTED' ? (
              <div className="py-4 space-y-4">
                <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Aparelho Conectado com Sucesso!
                  </p>
                  {connectedPhone && (
                    <p className="text-xs font-mono font-semibold text-emerald-800 mt-1">
                      +{connectedPhone}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pronto para enviar avisos no grupo oficial da comunidade.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDisconnecting}
                    onClick={handleDisconnect}
                    className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs w-full"
                  >
                    {isDisconnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5" />
                    )}
                    <span>Desconectar Aparelho</span>
                  </Button>
                </div>
              </div>
            ) : status === 'QR_READY' && qrCodeImg ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 font-medium text-left">
                  1. Abra o WhatsApp no celular<br />
                  2. Toque em <strong>Aparelhos Conectados</strong><br />
                  3. Aponte a câmera para o QR Code abaixo:
                </p>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeImg}
                    alt="QR Code WhatsApp"
                    className="w-52 h-52 mx-auto rounded-lg"
                  />
                </div>

                <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
                  Aguardando leitura do QR Code no celular...
                </p>

                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="text-xs w-full text-slate-600"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recarregar QR Code</span>
                  </Button>
                </div>
              </div>
            ) : isConnecting || status === 'CONNECTING' ? (
              <div className="py-8 space-y-4">
                <div className="inline-flex p-4 rounded-full bg-emerald-50 text-emerald-700">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Iniciando WhatsApp Web...
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Conectando com segurança aos servidores do WhatsApp. O QR Code aparecerá aqui em instantes.
                  </p>
                </div>
              </div>
            ) : hasSavedSession ? (
              <div className="py-6 space-y-4">
                <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Sessão Salva Detectada
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Seu aparelho já foi conectado. Restaurando a conexão com o WhatsApp...
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full text-xs"
                >
                  {isConnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Reconectar WhatsApp</span>
                </Button>
              </div>
            ) : (
              <div className="py-6 space-y-4">
                <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400">
                  <MessageSquare className="w-8 h-8" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Nenhum WhatsApp Conectado
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Gere o QR Code para conectar o número que faz parte do grupo dos ministros.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full text-xs"
                >
                  {isConnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <QrCode className="w-3.5 h-3.5" />
                  )}
                  <span>Gerar QR Code de Conexão</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 2 e 3: Painel de Envio de Lembrete no Grupo */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-800" />
              Lembrete no Grupo dos Ministros com Menções (@)
            </CardTitle>
            <CardDescription>
              Marque os ministros que vão servir na missa com aviso sonoro/push direto no grupo.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* 1. Seleção do Grupo de WhatsApp */}
            <div className="space-y-1.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={selectGrupoId} className="text-xs font-bold text-slate-800">
                  Grupo de WhatsApp que receberá o aviso:
                </label>
                {status === 'CONNECTED' && (
                  <button
                    type="button"
                    onClick={handleManualFetchGroups}
                    disabled={isLoadingGrupos}
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingGrupos ? 'animate-spin' : ''}`} />
                    Atualizar lista de grupos
                  </button>
                )}
              </div>

              {status !== 'CONNECTED' ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Conecte o WhatsApp no painel ao lado para carregar e selecionar o grupo.</span>
                </div>
              ) : grupos.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-1">
                  {isLoadingGrupos ? 'Buscando grupos...' : 'Nenhum grupo encontrado nesta conta.'}
                </p>
              ) : (
                <select
                  id={selectGrupoId}
                  value={selectedGroupId}
                  onChange={(e) => handleSelectGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
                >
                  <option value="">-- Selecione o Grupo Oficial dos Ministros --</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.subject} ({g.size} participantes)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Seleção da Missa Próxima */}
            <div className="space-y-1.5">
              <label htmlFor={selectMissaId} className="block text-xs font-bold text-slate-700">
                Selecione a Próxima Missa:
              </label>

              {todasMissasProximas.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Nenhuma missa agendada para os próximos dias na escala ativa.
                </p>
              ) : (
                <select
                  id={selectMissaId}
                  value={activeMissaKey}
                  onChange={(e) => {
                    setUserSelectedMissaKey(e.target.value);
                    setUserEditedTexto(null);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 font-medium"
                >
                  {todasMissasProximas.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.nomeDiaDaSemana} ({formatDateBR(item.data)}) às {item.cel.horario.slice(0, 5)} - {item.cel.descricao} ({item.cel.ministros.length} ministros)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 3. Lista de Ministros Escalados com Destaque de Notificação */}
            {missaSelecionada && (
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    Ministros que serão notificados com @:
                  </span>
                  <span className="text-[11px] font-mono text-emerald-800">
                    {missaSelecionada.cel.ministros.length} ministros
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {missaSelecionada.cel.ministros.map((m, i) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-slate-900 truncate">
                          {m.nome}
                        </span>
                      </div>

                      {m.telefone ? (
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {formatPhoneNumber(m.telefone)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 italic shrink-0">
                          Sem telefone
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Pré-visualização da Mensagem */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={textareaMensagemId} className="block text-xs font-bold text-slate-700">
                  Mensagem Formatada para o Grupo:
                </label>
                <span className="text-[10px] text-slate-400">
                  Você pode editar o texto antes de enviar
                </span>
              </div>

              <textarea
                id={textareaMensagemId}
                rows={9}
                value={textoExibido}
                onChange={(e) => setUserEditedTexto(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
              />
            </div>

            {/* Dica sobre Menções */}
            <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Como funciona a notificação:</strong> O Baileys envia as menções no formato oficial do WhatsApp. Quando a mensagem for postada no grupo, o WhatsApp transformará os <code>@telefones</code> no nome de contato dos ministros e disparará um alerta sonoro no celular de cada um deles!
              </span>
            </div>

            {/* Botão de Envio no Grupo */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="primary"
                disabled={
                  status !== 'CONNECTED' ||
                  !selectedGroupId ||
                  !missaSelecionada ||
                  isSending
                }
                onClick={handleSendToGroup}
                className="gap-2 text-xs h-10 px-5"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Enviar Aviso no Grupo com Notificação aos Ministros (@)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card de Agendamento Automático Diário (Lembrete da Véspera) */}
      <Card className="border border-emerald-100 shadow-sm bg-gradient-to-br from-white via-white to-emerald-50/20">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Disparo Automático Diário (Lembrete da Véspera)
                </CardTitle>
                <CardDescription>
                  Configure o horário para o sistema disparar todos os dias a escala do dia seguinte com marcações (@).
                </CardDescription>
              </div>
            </div>

            {autoReminderEnabled ? (
              <Badge variant="success" className="self-start sm:self-auto">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Agendamento Ativo ({autoReminderTime})
              </Badge>
            ) : (
              <Badge variant="neutral" className="self-start sm:self-auto">
                Desativado
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {configFeedback && (
            <Alert variant="success" title="Configuração Salva">
              {configFeedback}
            </Alert>
          )}

          {tomorrowFeedback && (
            <Alert
              variant={tomorrowFeedback.success ? 'success' : 'danger'}
              title={tomorrowFeedback.success ? 'Teste de Envio' : 'Atenção'}
            >
              {tomorrowFeedback.msg}
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Ativação */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <span className="text-xs font-bold text-slate-900 block">
                Status do Agendador:
              </span>
              <label htmlFor={ativarAgendadorId} className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  id={ativarAgendadorId}
                  type="checkbox"
                  checked={autoReminderEnabled}
                  onChange={(e) => setAutoReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Ativar envio automático diário
                </span>
              </label>
              <p className="text-[11px] text-slate-500">
                Quando ativado, o sistema envia a escala no horário selecionado.
              </p>
            </div>

            {/* 2. Horário do Disparo */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <label htmlFor={horarioDisparoId} className="text-xs font-bold text-slate-900 block">
                Horário Diário de Envio:
              </label>
              <input
                id={horarioDisparoId}
                type="time"
                value={autoReminderTime}
                onChange={(e) => setAutoReminderTime(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
              />
              <p className="text-[11px] text-slate-500">
                Exemplo: Se definido para <strong>20:00</strong>, hoje às 20h enviará a escala de amanhã.
              </p>
            </div>

            {/* 3. Grupo de Destino */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <span className="text-xs font-bold text-slate-900 block">
                Grupo de Destino:
              </span>
              <p className="text-xs font-semibold text-emerald-950 truncate pt-1">
                {isMounted && selectedGroupId
                  ? grupos.find((g) => g.id === selectedGroupId)?.subject || 'Grupo selecionado no painel acima'
                  : 'Nenhum grupo selecionado'}
              </p>
              <p className="text-[11px] text-slate-500">
                Vinculado ao grupo selecionado no painel de avisos.
              </p>
            </div>
          </div>

          {/* Explicação da Lógica */}
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Como funciona a regra diária:</p>
              <p className="text-slate-600">
                Todos os dias às <strong>{autoReminderTime}</strong>, o sistema verificará se há celebração cadastrada para o dia seguinte.
                Se houver missa amanhã, o sistema enviará a escala completa no grupo com as menções aos ministros (@).
                Se não houver missa amanhã, nenhum envio é realizado, evitando mensagens desnecessárias no grupo.
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestTomorrow}
              disabled={isTestingTomorrow || !selectedGroupId}
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              {isTestingTomorrow ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>Testar Envio da Escala de Amanhã Agora</span>
            </Button>

            <Button
              variant="primary"
              onClick={handleSaveReminderConfig}
              disabled={isSavingConfig}
              className="w-full sm:w-auto text-xs gap-1.5 px-5 h-9"
            >
              {isSavingConfig ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Settings className="w-3.5 h-3.5" />
              )}
              <span>Salvar Configuração do Agendador</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
