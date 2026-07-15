import { createI18n } from 'vue-i18n';
import ptBR from './pt-BR.json';
import es419 from './es-419.json';

export const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'es-419',
  messages: {
    'pt-BR': ptBR,
    'es-419': es419,
  },
});
