// Sessão anônima (§8.2): "anônimo primeiro, conta depois" — sem login obrigatório no loop
// principal. Falha de rede aqui não deve travar o jogo (ver uso em matchStore: persistência
// é best-effort).

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '../lib/supabase';

export const useUserStore = defineStore('user', () => {
  const userId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function ensureSession(): Promise<string | null> {
    if (userId.value) return userId.value;
    if (loading.value) return null;
    loading.value = true;
    error.value = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let id = sessionData.session?.user.id ?? null;
      if (!id) {
        const { data, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        id = data.user?.id ?? null;
      }
      if (id) {
        // runs.user_id referencia profiles(id) — precisa existir antes de qualquer insert em runs.
        const { error: profileError } = await supabase.from('profiles').upsert({ id }, { onConflict: 'id' });
        if (profileError) throw profileError;
      }
      userId.value = id;
      return userId.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { userId, loading, error, ensureSession };
});
