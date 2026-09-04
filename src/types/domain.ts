import { Ministro, CelebracaoRecorrente, CelebracaoEspecial, ExcecaoEscala } from './database.types';

export const DIAS_DA_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export type DiaDaSemanaIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const OCORRENCIAS_MES = [
  { valor: 1, label: '1ª ocorrência no mês' },
  { valor: 2, label: '2ª ocorrência no mês' },
  { valor: 3, label: '3ª ocorrência no mês' },
  { valor: 4, label: '4ª ocorrência no mês' },
  { valor: 5, label: '5ª ocorrência no mês' },
] as const;

export type OcorrenciaMesIndex = 1 | 2 | 3 | 4 | 5;

export interface MinistroVinculado {
  id: string;
  nome: string;
  telefone: string | null;
  ordem: number;
}

export interface CelebracaoRecorrenteCompleta extends CelebracaoRecorrente {
  ministros: MinistroVinculado[];
}

export interface CelebracaoEspecialCompleta extends CelebracaoEspecial {
  ministros: MinistroVinculado[];
}

export interface ExcecaoComMinistros extends ExcecaoEscala {
  ministroOriginal?: Ministro;
  ministroSubstituto?: Ministro | null;
}

export interface MinistroEscaladoNaData {
  id: string;
  nome: string;
  telefone: string | null;
  ordem: number;
  isSubstituto: boolean;
  foiSubstituido: boolean;
  ministroOriginalId?: string;
  ministroOriginalNome?: string;
  motivoExcecao?: string | null;
}

export interface CelebracaoDoDia {
  tipo: 'RECORRENTE' | 'ESPECIAL';
  celebracaoId: string;
  descricao: string;
  horario: string;
  observacoes?: string | null;
  ministros: MinistroEscaladoNaData[];
}

export interface EscalaDoDiaResolvida {
  data: string; // Formato YYYY-MM-DD
  dataValida: boolean;
  dentroDaVigencia: boolean;
  diaDaSemana: DiaDaSemanaIndex;
  nomeDiaDaSemana: string;
  ocorrenciaNoMes: OcorrenciaMesIndex;
  descricaoOcorrencia: string; // Ex: "1º domingo do mês"
  escalaId: string;
  escalaNome: string;
  celebracoes: CelebracaoDoDia[];
  totalCelebracoes: number;
  totalMinistrosServindo: number;
}
