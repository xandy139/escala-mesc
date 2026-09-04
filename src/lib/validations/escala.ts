import { z } from 'zod';

export const escalaSchema = z
  .object({
    nome: z
      .string()
      .min(3, 'O nome da escala deve ter pelo menos 3 caracteres (ex: Escala MESC 2026)')
      .max(100, 'Nome muito longo'),
    data_inicio: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida (use YYYY-MM-DD)'),
    data_fim: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida (use YYYY-MM-DD)'),
    ativa: z.boolean().default(false),
  })
  .refine((data) => data.data_fim >= data.data_inicio, {
    message: 'A data final deve ser igual ou posterior à data inicial',
    path: ['data_fim'],
  });

export type EscalaFormData = z.infer<typeof escalaSchema>;
