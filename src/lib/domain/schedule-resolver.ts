import {
  Escala,
  Ministro,
  ExcecaoEscala,
} from '@/types/database.types';
import {
  CelebracaoRecorrenteCompleta,
  CelebracaoEspecialCompleta,
  EscalaDoDiaResolvida,
  CelebracaoDoDia,
  MinistroEscaladoNaData,
} from '@/types/domain';
import {
  formatLocalDateToISO,
  getDayOfWeek,
  getDayOfWeekName,
  getMonthOccurrence,
  getOccurrenceDescription,
  isDateWithinScalePeriod,
} from './recurrence';

export interface ResolveScheduleParams {
  date: Date | string;
  escala: Escala;
  celebracoesRecorrentes: CelebracaoRecorrenteCompleta[];
  celebracoesEspeciais: CelebracaoEspecialCompleta[];
  excecoes: ExcecaoEscala[];
  ministrosCadastrados?: Record<string, Ministro>;
}

/**
 * Função central de domínio:
 * Recebe uma data e o contexto da escala ativa (celebrações recorrentes, especiais e exceções),
 * determinando com precisão absoluta as missas e os ministros escalados, aplicando as substituições pontuais.
 */
export function resolveScheduleForDate(params: ResolveScheduleParams): EscalaDoDiaResolvida {
  const {
    date,
    escala,
    celebracoesRecorrentes,
    celebracoesEspeciais,
    excecoes,
    ministrosCadastrados = {},
  } = params;

  const dataISO = formatLocalDateToISO(date);
  const diaDaSemana = getDayOfWeek(date);
  const nomeDiaDaSemana = getDayOfWeekName(diaDaSemana);
  const ocorrenciaNoMes = getMonthOccurrence(date);
  const descricaoOcorrencia = getOccurrenceDescription(date);

  const dentroDaVigencia = isDateWithinScalePeriod(
    dataISO,
    escala.data_inicio,
    escala.data_fim
  );

  const celebracoesResolvidas: CelebracaoDoDia[] = [];

  // Se estiver fora do período de vigência da escala, não há celebrações ativas para essa escala
  if (!dentroDaVigencia) {
    return {
      data: dataISO,
      dataValida: true,
      dentroDaVigencia: false,
      diaDaSemana,
      nomeDiaDaSemana,
      ocorrenciaNoMes,
      descricaoOcorrencia,
      escalaId: escala.id,
      escalaNome: escala.nome,
      celebracoes: [],
      totalCelebracoes: 0,
      totalMinistrosServindo: 0,
    };
  }

  // 1. Filtrar exceções para a data específica
  const excecoesNaData = excecoes.filter(
    (exc) => formatLocalDateToISO(exc.data) === dataISO
  );

  // 2. Resolver Celebrações Recorrentes que batem com dia da semana e ocorrência no mês
  const recorrentesDoDia = celebracoesRecorrentes.filter(
    (cr) =>
      cr.ativo &&
      cr.dia_semana === diaDaSemana &&
      cr.ocorrencia_mes === ocorrenciaNoMes
  );

  for (const rec of recorrentesDoDia) {
    const ministrosDaCelebracao: MinistroEscaladoNaData[] = [];

    // Busca exceções associadas a esta celebração recorrente nesta data
    const excecoesCelebracao = excecoesNaData.filter(
      (e) => e.celebracao_recorrente_id === rec.id
    );

    for (const ministroVinculado of rec.ministros) {
      // Verifica se este ministro tem substituição nesta celebração/data
      const excecao = excecoesCelebracao.find(
        (e) => e.ministro_original_id === ministroVinculado.id
      );

      if (excecao) {
        if (excecao.ministro_substituto_id) {
          // Houve substituição por outro ministro
          const substitutoInfo = ministrosCadastrados[excecao.ministro_substituto_id];
          ministrosDaCelebracao.push({
            id: excecao.ministro_substituto_id,
            nome: substitutoInfo ? substitutoInfo.nome : 'Ministro Substituto',
            telefone: substitutoInfo ? substitutoInfo.telefone : null,
            ordem: ministroVinculado.ordem,
            isSubstituto: true,
            foiSubstituido: false,
            ministroOriginalId: ministroVinculado.id,
            ministroOriginalNome: ministroVinculado.nome,
            motivoExcecao: excecao.motivo,
          });
        }
        // Nota: se ministro_substituto_id for null, é uma ausência registrada sem substituto,
        // logo o ministro original não entra na lista ativa de quem vai servir.
      } else {
        // Ministro original serve normalmente
        ministrosDaCelebracao.push({
          id: ministroVinculado.id,
          nome: ministroVinculado.nome,
          telefone: ministroVinculado.telefone,
          ordem: ministroVinculado.ordem,
          isSubstituto: false,
          foiSubstituido: false,
        });
      }
    }

    // Ordenar ministros pela ordem configurada
    ministrosDaCelebracao.sort((a, b) => a.ordem - b.ordem);

    celebracoesResolvidas.push({
      tipo: 'RECORRENTE',
      celebracaoId: rec.id,
      descricao: rec.descricao,
      horario: rec.horario,
      ministros: ministrosDaCelebracao,
    });
  }

  // 3. Resolver Celebrações Especiais cadastradas para a data específica
  const especiaisDoDia = celebracoesEspeciais.filter(
    (ce) => formatLocalDateToISO(ce.data) === dataISO
  );

  for (const esp of especiaisDoDia) {
    const ministrosDaCelebracao: MinistroEscaladoNaData[] = [];

    const excecoesCelebracao = excecoesNaData.filter(
      (e) => e.celebracao_especial_id === esp.id
    );

    for (const ministroVinculado of esp.ministros) {
      const excecao = excecoesCelebracao.find(
        (e) => e.ministro_original_id === ministroVinculado.id
      );

      if (excecao) {
        if (excecao.ministro_substituto_id) {
          const substitutoInfo = ministrosCadastrados[excecao.ministro_substituto_id];
          ministrosDaCelebracao.push({
            id: excecao.ministro_substituto_id,
            nome: substitutoInfo ? substitutoInfo.nome : 'Ministro Substituto',
            telefone: substitutoInfo ? substitutoInfo.telefone : null,
            ordem: ministroVinculado.ordem,
            isSubstituto: true,
            foiSubstituido: false,
            ministroOriginalId: ministroVinculado.id,
            ministroOriginalNome: ministroVinculado.nome,
            motivoExcecao: excecao.motivo,
          });
        }
      } else {
        ministrosDaCelebracao.push({
          id: ministroVinculado.id,
          nome: ministroVinculado.nome,
          telefone: ministroVinculado.telefone,
          ordem: ministroVinculado.ordem,
          isSubstituto: false,
          foiSubstituido: false,
        });
      }
    }

    ministrosDaCelebracao.sort((a, b) => a.ordem - b.ordem);

    celebracoesResolvidas.push({
      tipo: 'ESPECIAL',
      celebracaoId: esp.id,
      descricao: esp.descricao,
      horario: esp.horario,
      observacoes: esp.observacoes,
      ministros: ministrosDaCelebracao,
    });
  }

  // Ordenar as celebrações do dia por horário (ex: 08:00 antes de 19:00)
  celebracoesResolvidas.sort((a, b) => a.horario.localeCompare(b.horario));

  const totalMinistrosServindo = celebracoesResolvidas.reduce(
    (acc, cel) => acc + cel.ministros.length,
    0
  );

  return {
    data: dataISO,
    dataValida: true,
    dentroDaVigencia: true,
    diaDaSemana,
    nomeDiaDaSemana,
    ocorrenciaNoMes,
    descricaoOcorrencia,
    escalaId: escala.id,
    escalaNome: escala.nome,
    celebracoes: celebracoesResolvidas,
    totalCelebracoes: celebracoesResolvidas.length,
    totalMinistrosServindo,
  };
}
