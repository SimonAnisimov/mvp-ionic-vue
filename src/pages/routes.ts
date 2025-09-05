import { RouteRecordRaw } from 'vue-router';
import HomePage from './home/index.vue';
import AuthPage from './auth/index.vue';

export const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/auth'
  },
  {
    path: '/auth',
    name: 'Auth',
    component: AuthPage,
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/service-control',
    name: 'ServiceControl',
    component: () => import('./service-control/index.vue'),
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('./profile/index.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./settings/index.vue'),
  }
]
