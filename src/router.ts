import { createRouter, createWebHistory } from 'vue-router';
import { useMatchStore } from './stores/matchStore';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/draft' },
    { path: '/draft', name: 'draft', component: () => import('./views/DraftView.vue') },
    { path: '/match', name: 'match', component: () => import('./views/MatchView.vue') },
    { path: '/result', name: 'result', component: () => import('./views/ResultView.vue') },
    { path: '/rankings', name: 'rankings', component: () => import('./views/RankingsView.vue') },
    { path: '/almanaque', name: 'almanaque', component: () => import('./views/AlmanaqueView.vue') },
    { path: '/replay/:seed', name: 'replay', component: () => import('./views/MatchView.vue') },
  ],
});

// A tela de resultado só faz sentido com uma campanha encerrada — chegar nela direto (voltar do
// navegador após "Novo draft", por exemplo) deixaria a tela em branco sem essa checagem.
router.beforeEach((to) => {
  if (to.name !== 'result') return true;
  const match = useMatchStore();
  if (match.rounds.length === 0) return { name: 'draft' };
  if (!match.isCampaignOver) return { name: 'match' };
  return true;
});
