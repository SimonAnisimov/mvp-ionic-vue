import { app, router } from './app';
import AuthService from './services/AuthService';

// Добавляем глобальную обработку ошибок
window.addEventListener('error', (event) => {
  console.error('Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Необработанное отклонение промиса:', event.reason);
});

// Безопасная инициализация приложения
async function initializeApp() {
  try {
    console.log('Инициализация приложения...');
    
    // Ждем готовности роутера
    await router.isReady();
    console.log('Роутер готов');
    
    // Пытаемся восстановить состояние аутентификации
    try {
      const isRestored = await AuthService.restoreAuthState();
      console.log('Состояние аутентификации восстановлено:', isRestored);
    } catch (authError) {
      console.warn('Не удалось восстановить состояние аутентификации:', authError);
      // Продолжаем работу даже если не удалось восстановить состояние
    }
    
    // Монтируем приложение
    app.mount('#app');
    console.log('Приложение успешно инициализировано');
    
  } catch (error: any) {
    console.error('Критическая ошибка при инициализации приложения:', error);
    
    // Показываем пользователю сообщение об ошибке
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>Ошибка инициализации приложения</h2>
        <p>Произошла ошибка при запуске приложения. Пожалуйста, перезапустите приложение.</p>
        <details style="margin-top: 20px; text-align: left;">
          <summary>Техническая информация</summary>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">
${error?.message || 'Неизвестная ошибка'}
${error?.stack || ''}
          </pre>
        </details>
      </div>
    `;
  }
}

// Запускаем инициализацию
initializeApp();
