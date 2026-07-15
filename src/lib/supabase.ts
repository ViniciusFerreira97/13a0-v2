// Client Supabase (§8.2). Só conteúdo de usuário passa por aqui — editions/players/coaches
// continuam vindo do JSON estático (§8.3: sem query ao Postgres por request para conteúdo).

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
);
