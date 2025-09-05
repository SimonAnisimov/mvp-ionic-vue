import { Preferences } from '@capacitor/preferences';
import { api, setBaseURL, setAuthFunctions } from '../utils/api';
import {
  Login_Command,
  LoginResponse,
  SingleTokenModel,
  QuircoUserModel,
  StoredTokens,
  AuthState
} from '../types/auth';
import PropertyService from './PropertyService';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  SERVER_URL: 'server_url',
  USER_INFO: 'user_info',
  TOKEN_EXPIRES_AT: 'token_expires_at'
};

export class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    serverUrl: null,
    userInfo: null
  };

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
      // Настраиваем интерцепторы API
      AuthService.instance.setupApiInterceptors();
    }
    return AuthService.instance;
  }

  /**
   * Настраивает интерцепторы API для автоматической авторизации
   */
  private setupApiInterceptors(): void {
    setAuthFunctions(
      () => this.getAccessToken(),
      () => this.refreshToken()
    );
  }

  /**
   * Выполняет вход в систему
   */
  async login(serverUrl: string, username: string, password: string): Promise<LoginResponse> {
    try {
      // Устанавливаем базовый URL
      setBaseURL(serverUrl);
      
      // Получаем установленный baseURL для сохранения
      const baseURL = api.defaults.baseURL || serverUrl;
      
      console.log('Подключение к серверу:', baseURL);

      // Подготавливаем данные для логина
      const loginData: Login_Command = {
        username,
        password
      };

      console.log('Отправка запроса логина...');

      // Выполняем запрос логина с дополнительной обработкой ошибок
      const response = await api.post<LoginResponse>('/api/auth/oidc/sign-in', loginData);
      
      if (response.data.access && response.data.refresh) {
        // Сохраняем токены
        await this.saveTokens({
          access: response.data.access,
          refresh: response.data.refresh,
          serverUrl: baseURL!,
          expiresAt: response.data.accessExpiresIn ? 
            Date.now() + parseInt(response.data.accessExpiresIn) * 1000 : undefined
        });

        // Обновляем состояние
        this.authState = {
          isAuthenticated: true,
          accessToken: response.data.access,
          refreshToken: response.data.refresh,
          serverUrl: baseURL,
          userInfo: null
        };

        // Получаем информацию о пользователе
        try {
          const userInfo = await this.getUserInfo();
          this.authState.userInfo = userInfo;
          await Preferences.set({
            key: STORAGE_KEYS.USER_INFO,
            value: JSON.stringify(userInfo)
          });
        } catch (error) {
          console.warn('Не удалось получить информацию о пользователе:', error);
        }

        // Инициализируем PropertyService после успешного логина
        try {
          await PropertyService.initialize();
        } catch (error) {
          console.warn('Не удалось загрузить список объектов:', error);
        }

        return response.data;
      } else {
        throw new Error('Сервер не вернул токены');
      }
    } catch (error: any) {
      console.error('Ошибка при входе:', error);
      
      // Детальная диагностика ошибки
      let errorMessage = 'Ошибка при входе в систему';
      let errorDetails = '';
      
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        errorMessage = 'Ошибка сети';
        errorDetails = 'Проверьте подключение к интернету и доступность сервера';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Сервер недоступен';
        errorDetails = 'Проверьте правильность адреса сервера';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Сервер не найден';
        errorDetails = 'Проверьте правильность адреса сервера';
      } else if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
        errorMessage = 'Превышено время ожидания';
        errorDetails = 'Сервер не отвечает, попробуйте позже';
      } else if (error.response) {
        // Ошибка от сервера
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          errorMessage = 'Неверные учетные данные';
          errorDetails = 'Проверьте логин и пароль';
        } else if (status === 403) {
          errorMessage = 'Доступ запрещен';
          errorDetails = 'У вас нет прав для входа в систему';
        } else if (status === 404) {
          errorMessage = 'Сервис не найден';
          errorDetails = 'Проверьте правильность адреса сервера';
        } else if (status >= 500) {
          errorMessage = 'Ошибка сервера';
          errorDetails = `Код ошибки: ${status}`;
        } else {
          errorMessage = data?.message || `Ошибка HTTP ${status}`;
        }
      } else if (error.request) {
        // Запрос был отправлен, но ответа не получено
        errorMessage = 'Нет ответа от сервера';
        errorDetails = 'Проверьте подключение к интернету и доступность сервера';
      }
      
      console.error('Детали ошибки:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        baseURL: api.defaults.baseURL
      });
      
      // Добавляем техническую информацию для отладки
      const debugInfo = [
        `Сервер: ${serverUrl}`,
        `Итоговый URL: ${api.defaults.baseURL}/api/auth/oidc/sign-in`,
        `Код ошибки: ${error.code || 'не указан'}`,
        `HTTP статус: ${error.response?.status || 'не получен'}`,
        `Тип ошибки: ${error.name || 'неизвестен'}`,
        `Сообщение: ${error.message || 'не указано'}`
      ];
      
      if (error.response) {
        debugInfo.push(`Ответ сервера: ${JSON.stringify(error.response.data, null, 2)}`);
        debugInfo.push(`Заголовки ответа: ${JSON.stringify(error.response.headers, null, 2)}`);
      }
      
      if (error.request) {
        debugInfo.push(`Запрос отправлен, но ответ не получен`);
        debugInfo.push(`Конфигурация запроса: ${JSON.stringify({
          method: error.config?.method,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout
        }, null, 2)}`);
      }
      
      // Формируем детальное сообщение для передачи в UI
      const fullErrorMessage = `${errorMessage}${errorDetails ? '\n\nДетали:\n' + errorDetails : ''}\n\nТехническая информация:\n${debugInfo.join('\n')}`;
      
      console.error('Полная диагностика ошибки:', {
        originalError: error,
        serverUrl,
        baseURL: api.defaults.baseURL,
        debugInfo
      });
      
      // Создаем объект ошибки с детальной информацией
      const detailedError = new Error(fullErrorMessage);
      (detailedError as any).originalError = error;
      (detailedError as any).details = {
        serverUrl,
        errorCode: error.code,
        httpStatus: error.response?.status,
        responseData: error.response?.data,
        debugInfo
      };
      
      throw detailedError;
    }
  }

  /**
   * Выполняет выход из системы
   */
  async logout(): Promise<void> {
    console.log('Начинаем процесс выхода из системы...');
    
    // Сначала очищаем локальные данные
    try {
      await this.clearTokens();
      await PropertyService.clearData();
      this.authState = {
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        serverUrl: null,
        userInfo: null
      };
      console.log('Локальные данные аутентификации очищены');
    } catch (localError) {
      console.error('Ошибка при очистке локальных данных:', localError);
    }

    // Затем пытаемся уведомить сервер (необязательно)
    if (this.authState.accessToken) {
      try {
        await api.get('/api/auth/oidc/sign-out');
        console.log('Успешно уведомили сервер о выходе');
      } catch (error: any) {
        // Полностью игнорируем все ошибки сервера при выходе
        console.log('Не удалось уведомить сервер о выходе (это нормально):', {
          status: error.response?.status,
          message: error.message,
          code: error.code
        });
      }
    }
    
    console.log('Выход из системы завершен успешно');
  }

  /**
   * Обновляет токен доступа
   */
  async refreshToken(): Promise<string | null> {
    try {
      if (!this.authState.refreshToken) {
        throw new Error('Refresh token отсутствует');
      }

      const refreshData: SingleTokenModel = {
        token: this.authState.refreshToken
      };

      const response = await api.post<LoginResponse>('/api/auth/oidc/refresh', refreshData);

      if (response.data.access && response.data.refresh) {
        // Обновляем сохраненные токены
        await this.saveTokens({
          access: response.data.access,
          refresh: response.data.refresh,
          serverUrl: this.authState.serverUrl!,
          expiresAt: response.data.accessExpiresIn ? 
            Date.now() + parseInt(response.data.accessExpiresIn) * 1000 : undefined
        });

        // Обновляем состояние
        this.authState.accessToken = response.data.access;
        this.authState.refreshToken = response.data.refresh;

        return response.data.access;
      } else {
        throw new Error('Сервер не вернул новые токены');
      }
    } catch (error) {
      console.error('Ошибка при обновлении токена:', error);
      // При ошибке обновления токена выходим из системы
      await this.logout();
      return null;
    }
  }

  /**
   * Получает информацию о пользователе
   */
  async getUserInfo(): Promise<QuircoUserModel> {
    try {
      const response = await api.get<QuircoUserModel>('/api/auth/oidc/user-info-base');
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении информации о пользователе:', error);
      throw error;
    }
  }

  /**
   * Проверяет, авторизован ли пользователь
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.accessToken;
  }

  /**
   * Получает текущий токен доступа
   */
  getAccessToken(): string | null {
    return this.authState.accessToken;
  }

  /**
   * Получает информацию о пользователе из состояния
   */
  getCurrentUser(): QuircoUserModel | null {
    return this.authState.userInfo;
  }

  /**
   * Получает URL сервера
   */
  getServerUrl(): string | null {
    return this.authState.serverUrl;
  }

  /**
   * Восстанавливает состояние аутентификации из хранилища
   */
  async restoreAuthState(): Promise<boolean> {
    try {
      const [accessTokenResult, refreshTokenResult, serverUrlResult, userInfoResult] = await Promise.all([
        Preferences.get({ key: STORAGE_KEYS.ACCESS_TOKEN }),
        Preferences.get({ key: STORAGE_KEYS.REFRESH_TOKEN }),
        Preferences.get({ key: STORAGE_KEYS.SERVER_URL }),
        Preferences.get({ key: STORAGE_KEYS.USER_INFO })
      ]);

      const accessToken = accessTokenResult.value;
      const refreshToken = refreshTokenResult.value;
      const serverUrl = serverUrlResult.value;
      const userInfoStr = userInfoResult.value;

      if (accessToken && refreshToken && serverUrl) {
        // Устанавливаем базовый URL
        setBaseURL(serverUrl);

        // Восстанавливаем состояние
        this.authState = {
          isAuthenticated: true,
          accessToken,
          refreshToken,
          serverUrl,
          userInfo: userInfoStr ? JSON.parse(userInfoStr) : null
        };

        // Восстанавливаем состояние PropertyService
        await PropertyService.restoreState();

        return true;
      }

      return false;
    } catch (error) {
      console.error('Ошибка при восстановлении состояния аутентификации:', error);
      await this.clearTokens();
      return false;
    }
  }

  /**
   * Сохраняет токены в Preferences
   */
  private async saveTokens(tokens: StoredTokens): Promise<void> {
    await Promise.all([
      Preferences.set({ key: STORAGE_KEYS.ACCESS_TOKEN, value: tokens.access }),
      Preferences.set({ key: STORAGE_KEYS.REFRESH_TOKEN, value: tokens.refresh }),
      Preferences.set({ key: STORAGE_KEYS.SERVER_URL, value: tokens.serverUrl }),
      tokens.expiresAt ? 
        Preferences.set({ key: STORAGE_KEYS.TOKEN_EXPIRES_AT, value: tokens.expiresAt.toString() }) :
        Preferences.remove({ key: STORAGE_KEYS.TOKEN_EXPIRES_AT })
    ]);
  }

  /**
   * Очищает все сохраненные токены
   */
  private async clearTokens(): Promise<void> {
    await Promise.all([
      Preferences.remove({ key: STORAGE_KEYS.ACCESS_TOKEN }),
      Preferences.remove({ key: STORAGE_KEYS.REFRESH_TOKEN }),
      Preferences.remove({ key: STORAGE_KEYS.SERVER_URL }),
      Preferences.remove({ key: STORAGE_KEYS.USER_INFO }),
      Preferences.remove({ key: STORAGE_KEYS.TOKEN_EXPIRES_AT })
    ]);
  }
}

export default AuthService.getInstance();
