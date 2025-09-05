export interface Login_Command {
  username?: string;
  password?: string;
}

export interface LoginResponse {
  access?: string;
  refresh?: string;
  accessExpiresIn?: string;
  refreshExpiresIn?: string;
}

export interface SingleTokenModel {
  token?: string;
}

export interface PermissionsResponse {
  apps?: object;
}

export interface GetTokensResponse {
  access?: string;
  refresh?: string;
}

export interface QuircoUserModel {
  identityId?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
}

export interface ChangePassword_Command {
  oldPassword?: string;
  newPassword?: string;
}

// Дополнительные типы для нашего приложения
export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  serverUrl: string | null;
  userInfo: QuircoUserModel | null;
}

export interface StoredTokens {
  access: string;
  refresh: string;
  serverUrl: string;
  expiresAt?: number;
}
