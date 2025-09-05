import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

// Создаем экземпляр axios
export const api = axios.create({
  timeout: 30000, // Увеличиваем таймаут до 30 секунд
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
});

// Функция для выполнения HTTP запросов с учетом платформы
const performRequest = async (config: any) => {
  if (Capacitor.isNativePlatform()) {
    // Используем нативный HTTP для мобильных платформ
    const options = {
      url: `${config.baseURL || api.defaults.baseURL}${config.url}`,
      headers: { ...api.defaults.headers, ...config.headers },
      data: config.data,
    };

    try {
      let response;
      switch (config.method?.toLowerCase()) {
        case 'post':
          response = await CapacitorHttp.post(options);
          break;
        case 'put':
          response = await CapacitorHttp.put(options);
          break;
        case 'delete':
          response = await CapacitorHttp.delete(options);
          break;
        default:
          response = await CapacitorHttp.get(options);
      }
      
      return {
        data: response.data,
        status: response.status,
        statusText: response.status.toString(),
        headers: response.headers,
        config: config
      };
    } catch (error: any) {
      // Преобразуем ошибку в формат axios
      const axiosError = new Error(error.message || 'Network Error');
      (axiosError as any).response = {
        status: error.status || 0,
        data: error.data || null,
        headers: error.headers || {}
      };
      (axiosError as any).request = options;
      (axiosError as any).config = config;
      throw axiosError;
    }
  } else {
    // Используем axios для веб-платформы
    return axios(config);
  }
};

// Переопределяем методы axios для использования нативного HTTP на мобильных платформах
const originalPost = api.post;
const originalGet = api.get;
const originalPut = api.put;
const originalDelete = api.delete;

(api.post as any) = async function(url: string, data?: any, config?: any) {
  if (Capacitor.isNativePlatform()) {
    return performRequest({
      method: 'post',
      url,
      data,
      ...config,
      baseURL: config?.baseURL || api.defaults.baseURL
    });
  }
  return originalPost.call(api, url, data, config);
};

(api.get as any) = async function(url: string, config?: any) {
  if (Capacitor.isNativePlatform()) {
    return performRequest({
      method: 'get',
      url,
      ...config,
      baseURL: config?.baseURL || api.defaults.baseURL
    });
  }
  return originalGet.call(api, url, config);
};

// Функция для установки базового URL
export const setBaseURL = (url: string) => {
  let baseURL: string;
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Если протокол уже указан, используем как есть
    baseURL = url;
  } else if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
    // Для localhost используем HTTP (для прокси)
    baseURL = `http://${url}`;
  } else {
    // Для внешних серверов используем HTTPS
    baseURL = `https://${url}`;
  }
  
  // Устанавливаем baseURL для всех платформ одинаково
  api.defaults.baseURL = baseURL;
};

// Функция для получения текущего базового URL
export const getBaseURL = () => {
  return api.defaults.baseURL;
};

// Переменная для хранения функции получения токена
let getAccessTokenFn: (() => string | null) | null = null;
let refreshTokenFn: (() => Promise<string | null>) | null = null;

// Функция для установки функций получения и обновления токена
export const setAuthFunctions = (
  getToken: () => string | null,
  refreshToken: () => Promise<string | null>
) => {
  getAccessTokenFn = getToken;
  refreshTokenFn = refreshToken;
};

// Интерцептор запросов - добавляем Authorization заголовок
api.interceptors.request.use(
  (config) => {
    const token = getAccessTokenFn?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор ответов - обрабатываем 401 ошибки
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Если получили 401 и это не повторный запрос и не запрос на обновление токена
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/refresh')) {
      
      originalRequest._retry = true;

      try {
        // Пытаемся обновить токен
        const newToken = await refreshTokenFn?.();
        
        if (newToken) {
          // Обновляем заголовок и повторяем запрос
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Ошибка при обновлении токена:', refreshError);
        // Не пытаемся повторить запрос при ошибке обновления токена
      }
    }

    // Логируем детали ошибки для диагностики
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code
    });

    return Promise.reject(error);
  }
);

export default api;
