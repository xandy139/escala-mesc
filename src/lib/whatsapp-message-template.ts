export const DEFAULT_NOTIFICATION_TEMPLATE = `🔔 *LEMBRETE DE ESCALA - COMUNIDADE SANTA CRUZ* 🔔

Celebração: *{celebracao}*
📅 Data: *{dia_semana}, {data}*
⏰ Horário: *{horario}*

*Ministros escalados:*
{ministros}
Favor chegar com *20 minutos de antecedência*. Em caso de necessidade de substituição, favor avisar previamente aqui no grupo.

_Que Deus abençoe a todos e bom serviço ao altar!_ 🙏✨`;

export interface NotificationParams {
  celebracao: string;
  data: string;
  dia_semana: string;
  horario: string;
  ministros: string;
}

export interface TemplateVariable {
  tag: string;
  label: string;
  description: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { tag: '{celebracao}', label: 'Celebração', description: 'Nome/descrição da missa' },
  { tag: '{data}', label: 'Data', description: 'Data formatada (ex: 05/09/2026)' },
  { tag: '{dia_semana}', label: 'Dia da Semana', description: 'Ex: Sábado, Domingo' },
  { tag: '{horario}', label: 'Horário', description: 'Horário formatado (ex: 19:00)' },
  { tag: '{ministros}', label: 'Lista de Ministros', description: 'Lista numerada dos ministros escalados com menção @' },
];

/**
 * Renderiza uma mensagem de notificação substituindo as variáveis dinâmicas no modelo.
 */
export function renderNotificationMessage(
  template: string | null | undefined,
  params: NotificationParams
): string {
  const tpl = template && template.trim().length > 0 ? template : DEFAULT_NOTIFICATION_TEMPLATE;

  return tpl
    .replace(/\{celebracao\}/g, params.celebracao || '')
    .replace(/\{data\}/g, params.data || '')
    .replace(/\{dia_semana\}/g, params.dia_semana || '')
    .replace(/\{horario\}/g, params.horario || '')
    .replace(/\{ministros\}/g, params.ministros || 'Nenhum ministro escalado.\n');
}
