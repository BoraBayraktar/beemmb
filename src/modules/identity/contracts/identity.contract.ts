export type UserRole = "ADMIN" | "EDITOR" | "CUSTOMER";

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  isSuperAdmin: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  name: string;
  password: string;
};

export type ForgotPasswordInput = {
  email: string;
  locale?: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type ChangePasswordInput = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};

export type SocialAuthProvider = "google" | "apple" | "facebook";

export type SocialAuthProfile = {
  provider: SocialAuthProvider;
  providerAccountId: string;
  email: string | null;
  name: string | null;
};

export type LoginResult = {
  token: string;
  user: AuthUser;
};

export type IdentitySession = {
  sid: string;
  user: AuthUser;
};
