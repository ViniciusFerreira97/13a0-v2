import { createRouter, createWebHistory } from 'vue-router';

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
