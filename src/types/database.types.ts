export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ministros: {
        Row: {
          id: string;
          nome: string;
          telefone: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          telefone?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          telefone?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      escalas: {
        Row: {
          id: string;
          nome: string;
          data_inicio: string;
          data_fim: string;
          ativa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          data_inicio: string;
          data_fim: string;
          ativa?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          data_inicio?: string;
          data_fim?: string;
          ativa?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      celebracoes_recorrentes: {
        Row: {
          id: string;
          escala_id: string;
          descricao: string;
          dia_semana: number;
          ocorrencia_mes: number;
          horario: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          escala_id: string;
          descricao: string;
          dia_semana: number;
          ocorrencia_mes: number;
          horario: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          escala_id?: string;
          descricao?: string;
          dia_semana?: number;
          ocorrencia_mes?: number;
          horario?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "celebracoes_recorrentes_escala_id_fkey";
            columns: ["escala_id"];
            isOneToOne: false;
            referencedRelation: "escalas";
            referencedColumns: ["id"];
          }
        ];
      };
      celebracao_recorrente_ministros: {
        Row: {
          id: string;
          celebracao_recorrente_id: string;
          ministro_id: string;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          celebracao_recorrente_id: string;
          ministro_id: string;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          celebracao_recorrente_id?: string;
          ministro_id?: string;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "celebracao_recorrente_ministros_celebracao_recorrente_id_fkey";
            columns: ["celebracao_recorrente_id"];
            isOneToOne: false;
            referencedRelation: "celebracoes_recorrentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "celebracao_recorrente_ministros_ministro_id_fkey";
            columns: ["ministro_id"];
            isOneToOne: false;
            referencedRelation: "ministros";
            referencedColumns: ["id"];
          }
        ];
      };
      celebracoes_especiais: {
        Row: {
          id: string;
          escala_id: string;
          descricao: string;
          data: string;
          horario: string;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          escala_id: string;
          descricao: string;
          data: string;
          horario: string;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          escala_id?: string;
          descricao?: string;
          data?: string;
          horario?: string;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "celebracoes_especiais_escala_id_fkey";
            columns: ["escala_id"];
            isOneToOne: false;
            referencedRelation: "escalas";
            referencedColumns: ["id"];
          }
        ];
      };
      celebracao_especial_ministros: {
        Row: {
          id: string;
          celebracao_especial_id: string;
          ministro_id: string;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          celebracao_especial_id: string;
          ministro_id: string;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          celebracao_especial_id?: string;
          ministro_id?: string;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "celebracao_especial_ministros_celebracao_especial_id_fkey";
            columns: ["celebracao_especial_id"];
            isOneToOne: false;
            referencedRelation: "celebracoes_especiais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "celebracao_especial_ministros_ministro_id_fkey";
            columns: ["ministro_id"];
            isOneToOne: false;
            referencedRelation: "ministros";
            referencedColumns: ["id"];
          }
        ];
      };
      excecoes_escala: {
        Row: {
          id: string;
          escala_id: string;
          celebracao_recorrente_id: string | null;
          celebracao_especial_id: string | null;
          data: string;
          ministro_original_id: string;
          ministro_substituto_id: string | null;
          motivo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          escala_id: string;
          celebracao_recorrente_id?: string | null;
          celebracao_especial_id?: string | null;
          data: string;
          ministro_original_id: string;
          ministro_substituto_id?: string | null;
          motivo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          escala_id?: string;
          celebracao_recorrente_id?: string | null;
          celebracao_especial_id?: string | null;
          data?: string;
          ministro_original_id?: string;
          ministro_substituto_id?: string | null;
          motivo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "excecoes_escala_escala_id_fkey";
            columns: ["escala_id"];
            isOneToOne: false;
            referencedRelation: "escalas";
            referencedColumns: ["id"];
          }
        ];
      };
      historico_alteracoes: {
        Row: {
          id: string;
          user_id: string | null;
          tabela: string;
          registro_id: string;
          acao: string;
          dados_anteriores: Json | null;
          dados_novos: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          tabela: string;
          registro_id: string;
          acao: string;
          dados_anteriores?: Json | null;
          dados_novos?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          tabela?: string;
          registro_id?: string;
          acao?: string;
          dados_anteriores?: Json | null;
          dados_novos?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Ministro = Tables<'ministros'>;
export type Escala = Tables<'escalas'>;
export type CelebracaoRecorrente = Tables<'celebracoes_recorrentes'>;
export type CelebracaoEspecial = Tables<'celebracoes_especiais'>;
export type ExcecaoEscala = Tables<'excecoes_escala'>;
