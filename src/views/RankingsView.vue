<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <main class="screen placeholder">
    <h2>{{ t('nav.rankings') }}</h2>
    <p class="hint">Ranking diário/semanal ainda não implementado — depende do Supabase (§8.2).</p>
  </main>
</template>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  min-height: 80svh;
}

.hint {
  color: var(--text-muted);
}
</style>
