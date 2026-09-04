import { z } from 'zod';

export const ministroSchema = z.object({
  nome: z
    .string()
    .min(2, 'O nome deve conter pelo menos 2 caracteres')
    .max(120, 'O nome não pode exceder 120 caracteres')
    .transform((val) => val.trim()),
  telefone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const clean = val.replace(/\D/g, '');
      return clean.length > 0 ? clean : null;
    }),
  ativo: z.boolean().default(true),
});

export type MinistroFormData = z.infer<typeof ministroSchema>;
