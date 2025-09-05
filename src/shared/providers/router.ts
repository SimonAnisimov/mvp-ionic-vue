import { createRouter as create, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

export const createRouter = (routes: RouteRecordRaw[]) => 
  create({
    history: createWebHistory(),
    routes,
  });
