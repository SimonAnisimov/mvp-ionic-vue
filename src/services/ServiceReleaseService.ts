import { api } from '../utils/api';
import {
  ServiceReleaseSearchRequest,
  ServiceReleaseSearchResponse,
  ServiceReleaseFilters,
  ReleaseServiceRequest,
  ReleaseServiceErrorResponse
} from '../types/serviceRelease';
import PropertyService from './PropertyService';

export class ServiceReleaseService {
  private static instance: ServiceReleaseService;

  static getInstance(): ServiceReleaseService {
    if (!ServiceReleaseService.instance) {
      ServiceReleaseService.instance = new ServiceReleaseService();
    }
    return ServiceReleaseService.instance;
  }

  /**
   * Получает текущую дату из деталей выбранного объекта или текущую дату
   */
  private getCurrentDate(): string {
    const propertyDetails = PropertyService.getCurrentPropertyDetails();
    const currentDate = propertyDetails?.currentDate || new Date().toISOString().split('T')[0];
    return currentDate;
  }

  /**
   * Создает запрос для поиска услуг к отпуску
   */
  private createSearchRequest(filters: ServiceReleaseFilters): ServiceReleaseSearchRequest {
    const propertyDetails = PropertyService.getCurrentPropertyDetails();
    
    if (!propertyDetails) {
      throw new Error('Не загружены детали объекта');
    }

    return {
      propertyId: propertyDetails.id,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      statuses: null, // По умолчанию ищем только ожидающие
      nomenclatureIds: filters.nomenclatureIds,
      nomenclatureGroupIds: filters.nomenclatureGroupIds,
      pointOfServiceId: filters.pointOfServiceId,
      search: filters.search,
      includeCancelled: true
    };
  }

  /**
   * Выполняет поиск услуг к отпуску
   */
  async searchServicesToRelease(filters: ServiceReleaseFilters): Promise<ServiceReleaseSearchResponse> {
    try {
      const searchRequest = this.createSearchRequest(filters);
      
      const response = await api.post<ServiceReleaseSearchResponse>(
        '/hms/api/services/services-to-release/search',
        searchRequest
      );

      return response.data;
    } catch (error) {
      console.error('Ошибка при поиске услуг к отпуску:', error);
      throw error;
    }
  }

  /**
   * Получает фильтры по умолчанию
   */
  getDefaultFilters(): ServiceReleaseFilters {
    const currentDate = this.getCurrentDate();
    
    return {
      dateFrom: currentDate,
      dateTo: currentDate,
      pointOfServiceId: null,
      nomenclatureGroupIds: null,
      nomenclatureIds: null,
      search: ''
    };
  }

  /**
   * Форматирует дату в формат YYYY-MM-DD
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Парсит дату из строки YYYY-MM-DD
   */
  parseDate(dateString: string): Date {
    return new Date(dateString + 'T00:00:00');
  }

  /**
   * Отпускает услугу
   */
  async releaseService(itemId: number, pointOfServiceId: number, countToRelease: number = 1): Promise<void> {
    try {
      const releaseRequest: ReleaseServiceRequest = {
        releaseItemIds: [itemId],
        pointOfServiceId: pointOfServiceId,
        countToRelease: countToRelease
      };

      const response = await api.post(
        '/hms/api/services/services-to-release/release',
        releaseRequest
      );

      // Если статус 200, то успешно
      if (response.status === 200) {
        return;
      }
    } catch (error: any) {
      console.error('Ошибка при отпуске услуги:', error);
      
      // Обрабатываем ошибки валидации
      if (error.response?.status === 400) {
        const errorData: ReleaseServiceErrorResponse = error.response.data;
        
        // Формируем сообщение об ошибке из modelState
        let errorMessage = errorData.message || 'Ошибка при отпуске услуги';
        
        if (errorData.modelState) {
          const errors: string[] = [];
          Object.keys(errorData.modelState).forEach(key => {
            const fieldErrors = errorData.modelState[key];
            if (fieldErrors && fieldErrors.length > 0) {
              errors.push(...fieldErrors);
            }
          });
          
          if (errors.length > 0) {
            errorMessage = errors.join(', ');
          }
        }
        
        throw new Error(errorMessage);
      }
      
      throw new Error(error.response?.data?.message || 'Не удалось отпустить услугу');
    }
  }
}

export default ServiceReleaseService.getInstance();
