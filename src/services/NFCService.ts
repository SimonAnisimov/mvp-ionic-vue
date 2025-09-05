import { Capacitor } from '@capacitor/core';
import { NFCScanResult, NFCScanConfig, NFCCardData } from '../types/nfc';

// Условный импорт NFC библиотеки только для мобильных платформ
let NFC: any = null;
let nfcModuleLoadError: any = null;

if (Capacitor.isNativePlatform()) {
  try {
    const nfcModule = require('@exxili/capacitor-nfc');
    NFC = nfcModule.NFC;
    console.log('NFC модуль загружен успешно');
  } catch (error) {
    nfcModuleLoadError = error;
    console.warn('NFC module not available:', error);
  }
}

export class NFCService {
  private static instance: NFCService;
  private isInitialized = false;

  static getInstance(): NFCService {
    if (!NFCService.instance) {
      NFCService.instance = new NFCService();
    }
    return NFCService.instance;
  }

  /**
   * Инициализация NFC менеджера
   */
  async initialize(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) {
        console.log('NFC не поддерживается в веб-версии');
        return false;
      }

      if (nfcModuleLoadError) {
        console.log('NFC модуль не загружен из-за ошибки:', nfcModuleLoadError.message);
        return false;
      }

      if (!NFC) {
        console.log('NFC модуль недоступен');
        return false;
      }

      if (this.isInitialized) {
        return true;
      }

      // Проверяем поддержку NFC для @exxili/capacitor-nfc с дополнительной защитой
      try {
        const isSupported = await Promise.race([
          NFC.isSupported(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('NFC check timeout')), 5000)
          )
        ]);
        
        if (!isSupported || !isSupported.supported) {
          console.log('NFC не поддерживается на этом устройстве');
          return false;
        }
      } catch (supportError) {
        console.error('Ошибка проверки поддержки NFC:', supportError);
        return false;
      }

      this.isInitialized = true;
      console.log('NFC инициализирован успешно');
      return true;
    } catch (error) {
      console.error('Ошибка инициализации NFC:', error);
      return false;
    }
  }

  /**
   * Проверка доступности NFC
   */
  async isNFCAvailable(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform() || !NFC) {
        // В тестовом режиме всегда возвращаем true для демонстрации
        console.log('NFC недоступен, используем тестовый режим');
        return true;
      }

      // Для @exxili/capacitor-nfc используем правильные методы
      const isSupported = await NFC.isSupported();
      if (!isSupported.supported) {
        // В тестовом режиме всегда возвращаем true для демонстрации
        console.log('NFC не поддерживается, используем тестовый режим');
        return true;
      }

      const isEnabled = await NFC.isEnabled();
      return isEnabled.enabled;
    } catch (error) {
      console.error('Ошибка проверки NFC, используем тестовый режим:', error);
      // В случае ошибки возвращаем true для тестового режима
      return true;
    }
  }
  
  async scanCard(config: NFCScanConfig = {}): Promise<NFCScanResult> {
    try {
      // Проверяем инициализацию
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            error: 'NFC не поддерживается или недоступен'
          };
        }
      }

      // Проверяем доступность NFC
      const isAvailable = await this.isNFCAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'NFC отключен. Включите NFC в настройках устройства'
        };
      }

      console.log('Начинаем сканирование NFC карты...');

      // Запускаем сканирование с таймаутом
      const timeout = config.timeout || 30000; // 30 секунд по умолчанию
      
      const scanResult = await Promise.race([
        NFC.read(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      // Получаем данные карты
      const cardData = await this.processCardData(scanResult);
      
      if (cardData.cardholderName) {
        console.log('Успешно считано имя:', cardData.cardholderName);
        return {
          success: true,
          cardholderName: cardData.cardholderName,
          cardType: cardData.type
        };
      } else {
        // Если имя не найдено, используем UID как тестовое имя
        const testName = cardData.uid ? `Пациент_${cardData.uid.slice(-4)}` : 'Тестовый Пациент';
        console.log('Имя не найдено, используем тестовое:', testName);
        return {
          success: true,
          cardholderName: testName,
          cardType: cardData.type || 'Unknown'
        };
      }

    } catch (error: any) {
      console.error('Ошибка сканирования NFC:', error);

      let errorMessage = 'Ошибка сканирования карты';
      
      if (error.message?.includes('cancelled') || error.message?.includes('Timeout')) {
        errorMessage = 'Сканирование отменено или превышено время ожидания';
      } else if (error.message?.includes('not found') || error.message?.includes('no tag')) {
        errorMessage = 'Карта не найдена. Поднесите карту ближе к устройству';
      } else if (error.message?.includes('disabled')) {
        errorMessage = 'NFC отключен. Включите NFC в настройках устройства';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Обработка данных с карты
   */
  private async processCardData(scanResult: any): Promise<NFCCardData> {
    const cardData: NFCCardData = {};

    try {
      console.log('Полученные данные сканирования:', JSON.stringify(scanResult, null, 2));
      
      if (scanResult) {
        // Обрабатываем ID карты
        if (scanResult.id) {
          cardData.uid = this.bytesToHex(scanResult.id);
          console.log('UID карты:', cardData.uid);
        }

        // Обрабатываем тип карты
        if (scanResult.techTypes && Array.isArray(scanResult.techTypes)) {
          cardData.type = scanResult.techTypes[0] || 'Unknown';
        } else if (scanResult.type) {
          cardData.type = scanResult.type;
        } else {
          cardData.type = 'Unknown';
        }
        console.log('Тип карты:', cardData.type);

        // Обрабатываем NDEF записи если есть
        if (scanResult.ndefMessage && Array.isArray(scanResult.ndefMessage)) {
          for (const record of scanResult.ndefMessage) {
            if (record.payload) {
              const payload = this.parseNdefPayload(record);
              if (payload && payload.includes('Пациент')) {
                cardData.cardholderName = payload;
                break;
              }
            }
          }
        }

        // Для демонстрации создаем тестовое имя на основе UID
        if (!cardData.cardholderName && cardData.uid && cardData.uid.length > 0) {
          cardData.cardholderName = `${cardData.uid}`;
          console.log('Создано тестовое имя:', cardData.cardholderName);
        }
      }

    } catch (error) {
      console.error('Ошибка обработки данных карты:', error);
    }

    return cardData;
  }

  /**
   * Парсинг NDEF payload
   */
  private parseNdefPayload(record: any): string | null {
    try {
      if (!record.payload) return null;
      
      // Конвертируем payload в строку
      let payload = '';
      if (typeof record.payload === 'string') {
        payload = record.payload;
      } else if (Array.isArray(record.payload)) {
        payload = String.fromCharCode(...record.payload);
      }
      
      // Убираем служебные символы
      payload = payload.replace(/[\x00-\x1F\x7F]/g, '').trim();
      
      return payload || null;
    } catch (error) {
      console.error('Ошибка парсинга NDEF payload:', error);
      return null;
    }
  }

  /**
   * Конвертация байтов в hex строку
   */
  private bytesToHex(bytes: any): string {
    try {
      // Проверяем, что bytes существует
      if (!bytes) {
        console.warn('bytesToHex: bytes is null or undefined');
        return '';
      }

      // Если это уже строка, возвращаем как есть
      if (typeof bytes === 'string') {
        return bytes.toUpperCase();
      }

      // Если это массив
      if (Array.isArray(bytes)) {
        return bytes.map(byte => {
          const num = typeof byte === 'number' ? byte : parseInt(String(byte), 10);
          return num.toString(16).padStart(2, '0');
        }).join('').toUpperCase();
      }

      // Если это Uint8Array или подобный объект
      if (bytes.length !== undefined) {
        const byteArray = Array.from(bytes);
        return byteArray.map(byte => {
          const num = typeof byte === 'number' ? byte : parseInt(String(byte), 10);
          return num.toString(16).padStart(2, '0');
        }).join('').toUpperCase();
      }

      // Если это объект с числовыми свойствами
      if (typeof bytes === 'object') {
        const keys = Object.keys(bytes);
        if (keys.length > 0 && keys.every(key => !isNaN(parseInt(key, 10)))) {
          const byteArray = keys.map(key => bytes[key]);
          return byteArray.map(byte => {
            const num = typeof byte === 'number' ? byte : parseInt(String(byte), 10);
            return num.toString(16).padStart(2, '0');
          }).join('').toUpperCase();
        }
      }

      console.warn('bytesToHex: неподдерживаемый тип данных:', typeof bytes, bytes);
      return String(bytes);
    } catch (error) {
      console.error('Ошибка в bytesToHex:', error);
      return '';
    }
  }

  /**
   * Остановка NFC менеджера
   */
  async stop(): Promise<void> {
    try {
      if (!Capacitor.isNativePlatform() || !NFC) {
        return;
      }

      if (this.isInitialized) {
        // В @exxili/capacitor-nfc нет явного метода остановки
        this.isInitialized = false;
        console.log('NFC остановлен');
      }
    } catch (error) {
      console.error('Ошибка остановки NFC:', error);
    }
  }

  /**
   * Отмена текущего сканирования
   */
  async cancelScan(): Promise<void> {
    try {
      if (!Capacitor.isNativePlatform() || !NFC) {
        return;
      }

      // В @exxili/capacitor-nfc нет явного метода отмены
      console.log('Сканирование отменено');
    } catch (error) {
      console.error('Ошибка отмены сканирования:', error);
    }
  }
}

export default NFCService.getInstance();
