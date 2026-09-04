import {
  getDayOfWeek,
  getDayOfWeekName,
  getMonthOccurrence,
  getOccurrenceDescription,
  formatLocalDateToISO,
} from '../src/lib/domain/recurrence';
import { resolveScheduleForDate } from '../src/lib/domain/schedule-resolver';
import { Escala, Ministro } from '../src/types/database.types';
import { CelebracaoRecorrenteCompleta, CelebracaoEspecialCompleta } from '../src/types/domain';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ OK: ${message}`);
  }
}

console.log('--- 1. Testando regras matemáticas de datas e ocorrências ---');

// 06/09/2026: 1º domingo de setembro de 2026
const d1 = '2026-09-06';
assert(formatLocalDateToISO(d1) === '2026-09-06', 'ISO formatting 2026-09-06');
assert(getDayOfWeek(d1) === 0, 'Dia da semana deve ser 0 (Domingo)');
assert(getDayOfWeekName(d1) === 'Domingo', 'Nome do dia deve ser Domingo');
assert(getMonthOccurrence(d1) === 1, 'Ocorrência deve ser 1 (1º domingo)');
assert(getOccurrenceDescription(d1) === '1º domingo do mês', 'Descrição: 1º domingo do mês');

// 04/10/2026: 1º domingo de outubro de 2026
const d2 = '2026-10-04';
assert(getDayOfWeek(d2) === 0, 'Dia da semana de 04/10/2026 é Domingo');
assert(getMonthOccurrence(d2) === 1, '04/10/2026 é o 1º domingo do mês');

// 30/10/2026: Sexta-feira dia 30 -> 5ª sexta-feira do mês
const d3 = '2026-10-30';
assert(getDayOfWeek(d3) === 5, '30/10/2026 é Sexta-feira');
assert(getMonthOccurrence(d3) === 5, '30/10/2026 é a 5ª sexta-feira do mês');
assert(getOccurrenceDescription(d3) === '5ª sexta-feira do mês', 'Descrição: 5ª sexta-feira do mês');

console.log('\n--- 2. Testando resolução completa de escala com exceção/substituição ---');

const escala2026: Escala = {
  id: 'esc-2026',
  nome: 'Escala MESC 2026',
  data_inicio: '2026-01-01',
  data_fim: '2026-12-31',
  ativa: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const ministroAlexandre: Ministro = {
  id: 'min-alexandre',
  nome: 'Alexandre',
  telefone: '11999990001',
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const ministroJorge: Ministro = {
  id: 'min-jorge',
  nome: 'Jorge',
  telefone: '11999990002',
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const ministroKleiton: Ministro = {
  id: 'min-kleiton',
  nome: 'Kleiton',
  telefone: '11999990003',
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const ministrosMap = {
  [ministroAlexandre.id]: ministroAlexandre,
  [ministroJorge.id]: ministroJorge,
  [ministroKleiton.id]: ministroKleiton,
};

// Missa de Domingo: 1º domingo do mês às 08:00
const missa1Dom: CelebracaoRecorrenteCompleta = {
  id: 'cel-rec-1',
  escala_id: escala2026.id,
  descricao: 'Missa de Domingo',
  dia_semana: 0, // Domingo
  ocorrencia_mes: 1, // 1º domingo
  horario: '08:00',
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ministros: [
    { id: ministroKleiton.id, nome: ministroKleiton.nome, telefone: ministroKleiton.telefone, ordem: 1 },
    { id: ministroAlexandre.id, nome: ministroAlexandre.nome, telefone: ministroAlexandre.telefone, ordem: 2 },
  ],
};

// Celebração Especial em 06/02/2026 às 19:30
const missaEspecial: CelebracaoEspecialCompleta = {
  id: 'cel-esp-1',
  escala_id: escala2026.id,
  descricao: 'Missa ao Sagrado Coração de Jesus',
  data: '2026-02-06',
  horario: '19:30',
  observacoes: 'Primeira sexta-feira do mês',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ministros: [
    { id: ministroJorge.id, nome: ministroJorge.nome, telefone: ministroJorge.telefone, ordem: 1 },
  ],
};

// Exceção: em 04/10/2026, Alexandre é substituído por Jorge na Missa de Domingo
const excecoes = [
  {
    id: 'exc-1',
    escala_id: escala2026.id,
    celebracao_recorrente_id: missa1Dom.id,
    celebracao_especial_id: null,
    data: '2026-10-04',
    ministro_original_id: ministroAlexandre.id,
    ministro_substituto_id: ministroJorge.id,
    motivo: 'Compromisso pessoal de Alexandre',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Cenário A: 06/09/2026 (1º domingo sem exceção)
const resSetembro = resolveScheduleForDate({
  date: '2026-09-06',
  escala: escala2026,
  celebracoesRecorrentes: [missa1Dom],
  celebracoesEspeciais: [missaEspecial],
  excecoes,
  ministrosCadastrados: ministrosMap,
});

assert(resSetembro.celebracoes.length === 1, 'Setembro: 1 celebração encontrada');
assert(resSetembro.celebracoes[0].ministros.some((m) => m.id === ministroAlexandre.id && !m.isSubstituto), 'Setembro: Alexandre serve como titular');
assert(!resSetembro.celebracoes[0].ministros.some((m) => m.id === ministroJorge.id), 'Setembro: Jorge NÃO está escalado');

// Cenário B: 04/10/2026 (1º domingo COM substituição de Alexandre por Jorge)
const resOutubro = resolveScheduleForDate({
  date: '2026-10-04',
  escala: escala2026,
  celebracoesRecorrentes: [missa1Dom],
  celebracoesEspeciais: [missaEspecial],
  excecoes,
  ministrosCadastrados: ministrosMap,
});

assert(resOutubro.celebracoes.length === 1, 'Outubro: 1 celebração encontrada');
const ministrosOutubro = resOutubro.celebracoes[0].ministros;
assert(!ministrosOutubro.some((m) => m.id === ministroAlexandre.id), 'Outubro: Alexandre NÃO está na lista (substituído)');
const jorgeNaEscala = ministrosOutubro.find((m) => m.id === ministroJorge.id);
assert(jorgeNaEscala !== undefined, 'Outubro: Jorge está escalado como substituto');
assert(jorgeNaEscala?.isSubstituto === true, 'Outubro: Jorge está com flag isSubstituto=true');
assert(jorgeNaEscala?.ministroOriginalNome === 'Alexandre', 'Outubro: Origem da substituição aponta para Alexandre');

// Cenário C: 01/11/2026 (1º domingo de novembro - regra original preservada)
const resNovembro = resolveScheduleForDate({
  date: '2026-11-01',
  escala: escala2026,
  celebracoesRecorrentes: [missa1Dom],
  celebracoesEspeciais: [missaEspecial],
  excecoes,
  ministrosCadastrados: ministrosMap,
});

assert(resNovembro.celebracoes[0].ministros.some((m) => m.id === ministroAlexandre.id && !m.isSubstituto), 'Novembro: Alexandre volta a servir normalmente (regra original intacta)');

// Cenário D: 06/02/2026 (Celebração Especial por data)
const resEspecial = resolveScheduleForDate({
  date: '2026-02-06',
  escala: escala2026,
  celebracoesRecorrentes: [missa1Dom],
  celebracoesEspeciais: [missaEspecial],
  excecoes,
  ministrosCadastrados: ministrosMap,
});

assert(resEspecial.celebracoes.length === 1, 'Fevereiro 06: Celebração especial encontrada');
assert(resEspecial.celebracoes[0].tipo === 'ESPECIAL', 'Tipo é ESPECIAL');
assert(resEspecial.celebracoes[0].descricao === 'Missa ao Sagrado Coração de Jesus', 'Título confere com a celebração especial');
assert(resEspecial.celebracoes[0].ministros[0].nome === 'Jorge', 'Ministro Jorge escalado para a missa especial');

console.log('\n🎉 TODOS OS TESTES DE DOMÍNIO PASSARAM COM SUCESSO!');
