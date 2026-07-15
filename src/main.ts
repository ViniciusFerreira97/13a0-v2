import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@fontsource/anton/400.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './style.css';
import App from './App.vue';
import { router } from './router';
import { i18n } from './i18n';

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app');
