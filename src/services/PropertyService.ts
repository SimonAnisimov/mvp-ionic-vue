import { Preferences } from '@capacitor/preferences';
import { api } from '../utils/api';
import { Property, PropertiesSearchResponse, PropertyDetails } from '../types/property';

const STORAGE_KEYS = {
  SELECTED_PROPERTY: 'selected_property',
  PROPERTY_DETAILS: 'property_details',
  PROPERTIES_LIST: 'properties_list'
};

export class PropertyService {
  private static instance: PropertyService;
  private selectedProperty: Property | null = null;
  private propertyDetails: PropertyDetails | null = null;
  private propertiesList: Property[] = [];

  static getInstance(): PropertyService {
    if (!PropertyService.instance) {
      PropertyService.instance = new PropertyService();
    }
    return PropertyService.instance;
  }

  /**
   * Получает список объектов
   */
  async getProperties(): Promise<Property[]> {
    try {
      const response = await api.post<PropertiesSearchResponse>('/hms/api/properties/search', {});
      
      if (response.data.results) {
        this.propertiesList = response.data.results;
        await Preferences.set({
          key: STORAGE_KEYS.PROPERTIES_LIST,
          value: JSON.stringify(this.propertiesList)
        });
        
        // Если есть объекты и не выбран текущий, выбираем первый
        if (this.propertiesList.length > 0 && !this.selectedProperty) {
          await this.selectProperty(this.propertiesList[0]);
        }
        
        return this.propertiesList;
      }
      
      return [];
    } catch (error) {
      console.error('Ошибка при получении списка объектов:', error);
      throw error;
    }
  }

  /**
   * Получает детали объекта по ID
   */
  async getPropertyDetails(propertyId: number): Promise<PropertyDetails> {
    try {
      const response = await api.get<PropertyDetails>(`/hms/api/properties/${propertyId}`);
      
      if (response.data) {
        this.propertyDetails = response.data;
        await Preferences.set({
          key: STORAGE_KEYS.PROPERTY_DETAILS,
          value: JSON.stringify(this.propertyDetails)
        });
        return this.propertyDetails;
      }
      
      throw new Error('Не удалось получить детали объекта');
    } catch (error) {
      console.error('Ошибка при получении деталей объекта:', error);
      throw error;
    }
  }

  /**
   * Выбирает объект и загружает его детали
   */
  async selectProperty(property: Property): Promise<PropertyDetails> {
    try {
      this.selectedProperty = property;
      await Preferences.set({
        key: STORAGE_KEYS.SELECTED_PROPERTY,
        value: JSON.stringify(property)
      });
      
      // Загружаем детали выбранного объекта
      const details = await this.getPropertyDetails(property.id);
      return details;
    } catch (error) {
      console.error('Ошибка при выборе объекта:', error);
      throw error;
    }
  }

  /**
   * Получает текущий выбранный объект
   */
  getSelectedProperty(): Property | null {
    return this.selectedProperty;
  }

  /**
   * Получает детали текущего объекта
   */
  getCurrentPropertyDetails(): PropertyDetails | null {
    return this.propertyDetails;
  }

  /**
   * Получает список всех объектов
   */
  getPropertiesList(): Property[] {
    return this.propertiesList;
  }

  /**
   * Восстанавливает состояние из хранилища
   */
  async restoreState(): Promise<void> {
    try {
      const [selectedPropertyResult, propertyDetailsResult, propertiesListResult] = await Promise.all([
        Preferences.get({ key: STORAGE_KEYS.SELECTED_PROPERTY }),
        Preferences.get({ key: STORAGE_KEYS.PROPERTY_DETAILS }),
        Preferences.get({ key: STORAGE_KEYS.PROPERTIES_LIST })
      ]);

      if (selectedPropertyResult.value) {
        this.selectedProperty = JSON.parse(selectedPropertyResult.value);
      }

      if (propertyDetailsResult.value) {
        this.propertyDetails = JSON.parse(propertyDetailsResult.value);
      }

      if (propertiesListResult.value) {
        this.propertiesList = JSON.parse(propertiesListResult.value);
      }
    } catch (error) {
      console.error('Ошибка при восстановлении состояния PropertyService:', error);
    }
  }

  /**
   * Очищает все данные объектов
   */
  async clearData(): Promise<void> {
    try {
      await Promise.all([
        Preferences.remove({ key: STORAGE_KEYS.SELECTED_PROPERTY }),
        Preferences.remove({ key: STORAGE_KEYS.PROPERTY_DETAILS }),
        Preferences.remove({ key: STORAGE_KEYS.PROPERTIES_LIST })
      ]);

      this.selectedProperty = null;
      this.propertyDetails = null;
      this.propertiesList = [];
    } catch (error) {
      console.error('Ошибка при очистке данных PropertyService:', error);
    }
  }

  /**
   * Инициализация после логина - загружает список объектов
   */
  async initialize(): Promise<void> {
    try {
      await this.getProperties();
    } catch (error) {
      console.error('Ошибка при инициализации PropertyService:', error);
      throw error;
    }
  }
}

export default PropertyService.getInstance();
