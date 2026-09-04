import {
  DIAS_DA_SEMANA,
  DiaDaSemanaIndex,
  OcorrenciaMesIndex,
} from '@/types/domain';

/**
 * Converte com segurança uma data (Date ou string YYYY-MM-DD) para um objeto Date local,
 * evitando problemas comuns de deslocamento de fuso horário UTC no JavaScript.
 */
export function parseLocalDate(input: Date | string): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  if (typeof input === 'string') {
    // Trata formato 'YYYY-MM-DD'
    const parts = input.trim().split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }

  const d = new Date(input);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Retorna a representação da data no formato padrão ISO YYYY-MM-DD.
 */
export function formatLocalDateToISO(date: Date | string): string {
  const d = parseLocalDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o dia da semana: 0 = Domingo, 1 = Segunda-feira, ..., 6 = Sábado.
 */
export function getDayOfWeek(input: Date | string): DiaDaSemanaIndex {
  const d = parseLocalDate(input);
  return d.getDay() as DiaDaSemanaIndex;
}

/**
 * Nome textual do dia da semana em português (ex: "Domingo", "Segunda-feira").
 */
export function getDayOfWeekName(input: DiaDaSemanaIndex | Date | string): string {
  if (typeof input === 'number') {
    return DIAS_DA_SEMANA[input] ?? 'Desconhecido';
  }
  const dayIndex = getDayOfWeek(input);
  return DIAS_DA_SEMANA[dayIndex];
}

/**
 * Calcula a ocorrência daquele dia da semana dentro do mês (1ª a 5ª ocorrência).
 * Regra matemática invariante:
 * Dias 01 a 07 = 1ª ocorrência
 * Dias 08 a 14 = 2ª ocorrência
 * Dias 15 a 21 = 3ª ocorrência
 * Dias 22 a 28 = 4ª ocorrência
 * Dias 29 a 31 = 5ª ocorrência
 */
export function getMonthOccurrence(input: Date | string): OcorrenciaMesIndex {
  const d = parseLocalDate(input);
  const dayOfMonth = d.getDate();
  const occurrence = Math.floor((dayOfMonth - 1) / 7) + 1;
  return Math.min(Math.max(occurrence, 1), 5) as OcorrenciaMesIndex;
}

/**
 * Retorna a descrição amigável da ocorrência (ex: "1º domingo do mês", "3ª segunda-feira do mês").
 */
export function getOccurrenceDescription(input: Date | string): string {
  const d = parseLocalDate(input);
  const dayOfWeek = getDayOfWeek(d);
  const occurrence = getMonthOccurrence(d);

  // Gênero gramatical do numeral ordinal
  // Domingo e Sábado são masculinos ("1º domingo", "1º sábado")
  // Segunda, Terça, Quarta, Quinta, Sexta são femininos ("1ª segunda-feira")
  const isMasculino = dayOfWeek === 0 || dayOfWeek === 6;
  const ordinal = isMasculino ? `${occurrence}º` : `${occurrence}ª`;
  const nomeDia = DIAS_DA_SEMANA[dayOfWeek].toLowerCase();

  return `${ordinal} ${nomeDia} do mês`;
}

/**
 * Verifica se uma data específica está dentro do período de vigência de uma escala.
 */
export function isDateWithinScalePeriod(
  dateInput: Date | string,
  startDateInput: Date | string,
  endDateInput: Date | string
): boolean {
  const target = formatLocalDateToISO(dateInput);
  const start = formatLocalDateToISO(startDateInput);
  const end = formatLocalDateToISO(endDateInput);

  return target >= start && target <= end;
}

export type CategoriaMissa = 'MANHA' | 'NOITE' | 'DIARIA';

/**
 * Classifica a celebração em Missa da Manhã, Missa da Noite ou Missa Diária
 */
export function classifyCelebration(diaSemana: number, horario: string): CategoriaMissa {
  const hora = parseInt(horario.slice(0, 2), 10);
  if (diaSemana === 0) {
    return hora < 12 ? 'MANHA' : 'NOITE';
  }
  return 'DIARIA';
}

export function getCategoriaMissaLabel(cat: CategoriaMissa): string {
  switch (cat) {
    case 'MANHA':
      return 'Missa da Manhã';
    case 'NOITE':
      return 'Missa da Noite';
    case 'DIARIA':
      return 'Missa Diária';
  }
}

