/**
 * Результат сканирования NFC карты
 */
export interface NFCScanResult {
  success: boolean;
  cardholderName?: string;
  error?: string;
  cardType?: string;
}

/**
 * Состояние NFC сканера
 */
export enum NFCScanState {
  IDLE = 'idle',
  SCANNING = 'scanning',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * Конфигурация NFC сканирования
 */
export interface NFCScanConfig {
  timeout?: number; // Таймаут сканирования в миллисекундах
  alertMessage?: string; // Сообщение для пользователя
}

/**
 * Данные с NFC карты
 */
export interface NFCCardData {
  uid?: string;
  cardholderName?: string;
  cardNumber?: string;
  expiryDate?: string;
  type?: string;
}
