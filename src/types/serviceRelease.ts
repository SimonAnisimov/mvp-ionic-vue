// Типы для системы контроля отпуска услуг

export interface ServiceReleaseSearchRequest {
  propertyId: number;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  statuses: string[] | null;
  nomenclatureIds: number[] | null;
  nomenclatureGroupIds: number[] | null;
  pointOfServiceId: number | null;
  search: string;
  includeCancelled: boolean;
}

export interface ServiceReleaseGroup {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Guests {
  adults: number;
  children1: number;
  children2: number;
  children3: number;
  children4: number;
  children5: number;
  totalCount: number;
  layout: string;
}

export interface Nomenclature {
  id: number;
  name: string;
  code: string;
  description: string;
  article: string;
  group: ServiceReleaseGroup;
  nomenclatureGroupId: number;
  transactionCode: string;
  transactionCodeId: number;
  currencyId: string;
  defaultSubAccountCode: string;
  price: number;
  canBeReleasedManually: boolean;
  allowCustomPrice: boolean;
  measurementUnit: string;
  nomenclatureType: string;
  dateDeleted: string | null;
  sortOrder: number;
}

export interface PointOfService {
  fullName: string;
  colorHex: string;
  sortOrder: number;
  code: string;
  id: number;
  name: string;
}

export interface Room {
  fullName: string;
  colorHex: string;
  sortOrder: number;
  code: string;
  id: number;
  name: string;
  dateDeleted: string | null;
  isActive: boolean;
  cleaningStatus: string;
  cleaningType: string;
}

export interface ItemRelease {
  id: number;
  scheduleDate: string;
  stayDateFrom: string;
  stayDateTo: string;
  totalCount: number;
  releasedCount: number;
  guests: Guests;
  ownerId: string;
  ownerType: string;
  nomenclature: Nomenclature;
  pointOfService: PointOfService;
  isReleased: boolean;
  customerName: string;
  room: Room;
  status: string;
}

export interface ItemToReleaseGroup {
  totalCount: number;
  releasedCount: number;
  group: ServiceReleaseGroup;
  itemReleases: ItemRelease[];
}

export interface ServiceReleaseSearchResponse {
  totalCount: number;
  releasedCount: number;
  itemToReleaseGroups: ItemToReleaseGroup[];
}

// Типы для фильтров
export interface ServiceReleaseFilters {
  dateFrom: string;
  dateTo: string;
  pointOfServiceId: number | null;
  nomenclatureGroupIds: number[] | null;
  nomenclatureIds: number[] | null;
  search: string;
}

// Типы для отпуска услуг
export interface ReleaseServiceRequest {
  releaseItemIds: number[];
  pointOfServiceId: number;
  countToRelease: number;
}

export interface ReleaseServiceErrorResponse {
  modelState: {
    [key: string]: string[];
  };
  message: string;
}
