export interface Property {
  isActive: boolean;
  fullName: string;
  sortOrder: number;
  code: string;
  id: number;
  name: string;
}

export interface PropertiesSearchResponse {
  results: Property[];
  count: number;
}

export interface StaySchema {
  checkInTime: string;
  checkOutTime: string;
  unit: string;
  fullName: string;
  sortOrder: number;
  code: string;
  id: number;
  name: string;
}

export interface AgeQualifier {
  ageFrom: number;
  ageTo: number;
  settleToMainPlace: boolean;
  noPlace: boolean;
  category: string;
  propertyId: number;
  isActive: boolean;
  fullName: string;
  sortOrder: number;
  code: string;
  id: number;
  name: string;
}

export interface AgentTransactionCodeModel {
  id: number;
  code: string;
  name: string;
  paymentKind: string;
}

export interface PropertyDetails {
  currentDate: string;
  bookingHorizonDays: number;
  defaultStaySchema: StaySchema;
  ageQualifiers: AgeQualifier[];
  staySchemas: StaySchema[];
  agentTransactionCodes: string[];
  agentTransactionCodeModels: AgentTransactionCodeModel[];
  licenseKey: string;
  isActive: boolean;
  fullName: string;
  sortOrder: number;
  code: string;
  id: number;
  name: string;
}
