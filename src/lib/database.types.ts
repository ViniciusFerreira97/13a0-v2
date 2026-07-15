// Tipos escritos à mão a partir de supabase/migrations/0001_init.sql — não há CLI do Supabase
// logada neste ambiente para gerar via `supabase gen types typescript`. Cobre só as tabelas
// que o client hoje usa (profiles, runs); as demais (daily_*, achievements) entram quando as
// telas correspondentes forem implementadas. O formato (Row/Insert/Update/Relationships,
// Views, Functions) segue o exigido por @supabase/postgrest-js nesta versão.

type Mode = 'copa_classica' | 'almanaque' | 'la_revancha' | 'classicos_eternos' | 'desafio_diario';
type Style = 'defensivo' | 'equilibrado' | 'ofensivo';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          handle?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          handle?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          id: string;
          user_id: string;
          mode: Mode;
          seed: string;
          formation: string;
          style: Style;
          picks: unknown;
          result: unknown | null;
          glory: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: Mode;
          seed: string;
          formation: string;
          style: Style;
          picks: unknown;
          result?: unknown | null;
          glory?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: Mode;
          seed?: string;
          formation?: string;
          style?: Style;
          picks?: unknown;
          result?: unknown | null;
          glory?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
