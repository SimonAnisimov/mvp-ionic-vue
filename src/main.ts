import { app, router } from './app';

router.isReady().then(() => {
  app.mount('#app');
});
