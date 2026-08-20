import { createPrivateKey, randomUUID } from "node:crypto";

import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

import { redisCache } from "@/lib/redis";
import { AUTH_TOKEN_TTL_SECONDS } from "@/lib/auth";
import { logError, logInfo } from "@/lib/observability";
import type {
  AuthUser,
  ChangePasswordInput,
  ForgotPasswordInput,
  IdentitySession,
  LoginInput,
  LoginResult,
  RegisterInput,
  ResetPasswordInput,
  SocialAuthProfile,
} from "@/modules/identity/contracts/identity.contract";
import { IdentityRepository } from "@/modules/identity/repositories/identity.repository";
import { notificationService } from "@/modules/system/services/notification.service";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2),
  password: z.string().min(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
  locale: z.enum(["tr", "en"]).optional(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(24),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  userId: z.string().trim().min(1),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

type SessionTokenPayload = {
  sid: string;
};

function getJwtSecret() {
  const secret = process.env.AUTH_SECRET ?? "dev-auth-secret-change-me";
  return new TextEncoder().encode(secret);
}

function getSessionCacheKey(sid: string) {
  return `identity:session:${sid}`;
}

function getPasswordResetCacheKey(token: string) {
  return `identity:password-reset:${token}`;
}

function getPasswordResetRateLimitKey(email: string) {
  return `identity:password-reset-rate:${email.toLowerCase()}`;
}

function resolveAppUrl() {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return configured;
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) {
    return vercelProductionUrl.startsWith("http") ? vercelProductionUrl : `https://${vercelProductionUrl}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return null;
}

async function signSessionToken(user: AuthUser, sid: string) {
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${AUTH_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

function getApplePrivateKey() {
  const raw = process.env.APPLE_OAUTH_PRIVATE_KEY;
  if (!raw) {
    return null;
  }

  return createPrivateKey(raw.replace(/\\n/g, "\n"));
}

export class IdentityService {
  constructor(private readonly repository: IdentityRepository) {}

  private async createSessionForUser(user: AuthUser): Promise<LoginResult> {
    const sid = randomUUID();
    const token = await signSessionToken(user, sid);

    const session: IdentitySession = {
      sid,
      user,
    };

    await redisCache.set(getSessionCacheKey(sid), session, AUTH_TOKEN_TTL_SECONDS);

    return {
      token,
      user,
    };
  }

  async register(input: RegisterInput): Promise<LoginResult> {
    const parsed = registerSchema.parse(input);
    const existing = await this.repository.findByEmail(parsed.email);

    if (existing) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hash(parsed.password, 10);
    const created = await this.repository.createCustomer({
      email: parsed.email,
      name: parsed.name,
      passwordHash,
    });

    const user: AuthUser = {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      isSuperAdmin: created.isSuperAdmin,
    };

    return this.createSessionForUser(user);
  }

  async login(input: LoginInput): Promise<LoginResult | null> {
    const parsed = loginSchema.parse(input);
    const account = await this.repository.findByEmail(parsed.email);

    if (!account) {
      return null;
    }

    const valid = await compare(parsed.password, account.passwordHash);
    if (!valid) {
      return null;
    }

    const user: AuthUser = {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      isSuperAdmin: account.isSuperAdmin,
    };

    return this.createSessionForUser(user);
  }

  async getAuthenticatedUser(token?: string): Promise<AuthUser | null> {
    if (!token) {
      return null;
    }

    try {
      const verification = await jwtVerify<SessionTokenPayload>(token, getJwtSecret());
      const sid = verification.payload.sid;
      const userId = verification.payload.sub;

      if (!sid || !userId) {
        return null;
      }

      const cachedSession = await redisCache.get<IdentitySession>(getSessionCacheKey(sid));
      if (cachedSession?.user) {
        return cachedSession.user;
      }

      const account = await this.repository.findById(userId);
      if (!account) {
        return null;
      }

      const user: AuthUser = {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        isSuperAdmin: account.isSuperAdmin,
      };

      await redisCache.set(
        getSessionCacheKey(sid),
        {
          sid,
          user,
        },
        AUTH_TOKEN_TTL_SECONDS,
      );

      return user;
    } catch {
      return null;
    }
  }

  async logout(token?: string) {
    if (!token) {
      return;
    }

    try {
      const verification = await jwtVerify<SessionTokenPayload>(token, getJwtSecret());
      const sid = verification.payload.sid;
      if (!sid) {
        return;
      }

      await redisCache.del(getSessionCacheKey(sid));
    } catch {
      return;
    }
  }

  async requestPasswordReset(input: ForgotPasswordInput) {
    const parsed = forgotPasswordSchema.parse(input);
    const email = parsed.email.toLowerCase();
    const rateLimitKey = getPasswordResetRateLimitKey(email);
    const existingRequest = await redisCache.get<string>(rateLimitKey);

    if (existingRequest) {
      return { ok: true };
    }

    const account = await this.repository.findByEmail(email);
    await redisCache.set(rateLimitKey, "1", 60);

    if (!account) {
      return { ok: true };
    }

    const token = `${randomUUID()}${randomUUID().replace(/-/g, "")}`;
    const locale = parsed.locale ?? "tr";
    const appUrl = resolveAppUrl() ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/${locale}/reset-password?token=${encodeURIComponent(token)}`;

    await redisCache.set(
      getPasswordResetCacheKey(token),
      { userId: account.id, email: account.email },
      60 * 30,
    );

    const subject = locale === "tr" ? "BEEMMB sifre sifirlama baglantisi" : "BEEMMB password reset link";
    const text = locale === "tr"
      ? `Merhaba ${account.name},\n\nSifrenizi sifirlamak icin asagidaki baglantiyi kullanin:\n${resetUrl}\n\nBu baglanti 30 dakika boyunca gecerlidir.\nEger bu islemi siz baslatmadiysaniz bu e-postayi yok sayabilirsiniz.`
      : `Hello ${account.name},\n\nUse the link below to reset your password:\n${resetUrl}\n\nThis link is valid for 30 minutes.\nIf you did not request this, you can ignore this email.`;

    try {
      await notificationService.sendEmail({
        to: account.email,
        subject,
        text,
      });
      logInfo("Password reset email queued", {
        scope: "identity.password-reset",
        userId: account.id,
      });
    } catch (error) {
      logError("Password reset email failed", {
        scope: "identity.password-reset",
        userId: account.id,
        error: error instanceof Error ? error.message : "UNKNOWN",
      });
    }

    return { ok: true };
  }

  async resetPassword(input: ResetPasswordInput) {
    const parsed = resetPasswordSchema.parse(input);
    const payload = await redisCache.get<{ userId: string; email: string }>(getPasswordResetCacheKey(parsed.token));

    if (!payload?.userId) {
      throw new Error("PASSWORD_RESET_TOKEN_INVALID");
    }

    const passwordHash = await hash(parsed.password, 10);
    await this.repository.updatePasswordById(payload.userId, passwordHash);
    await redisCache.del(getPasswordResetCacheKey(parsed.token));

    logInfo("Password reset completed", {
      scope: "identity.password-reset",
      userId: payload.userId,
    });

    return { ok: true };
  }

  async changePassword(input: ChangePasswordInput) {
    const parsed = changePasswordSchema.parse(input);
    const account = await this.repository.findByIdWithPassword(parsed.userId);

    if (!account) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const currentPasswordValid = await compare(parsed.currentPassword, account.passwordHash);
    if (!currentPasswordValid) {
      throw new Error("CURRENT_PASSWORD_INVALID");
    }

    const samePassword = await compare(parsed.newPassword, account.passwordHash);
    if (samePassword) {
      throw new Error("PASSWORD_REUSE_NOT_ALLOWED");
    }

    const passwordHash = await hash(parsed.newPassword, 10);
    await this.repository.updatePasswordById(account.id, passwordHash);

    logInfo("Password changed by authenticated user", {
      scope: "identity.change-password",
      userId: account.id,
    });

    return { ok: true };
  }

  async loginWithSocialProfile(profile: SocialAuthProfile): Promise<LoginResult> {
    const linked = await this.repository.findSocialAccount(profile.provider, profile.providerAccountId);
    if (linked?.user) {
      return this.createSessionForUser(linked.user);
    }

    const normalizedEmail = profile.email?.trim().toLowerCase() ?? `${profile.provider}-${profile.providerAccountId}@oauth.local`;
    const existing = await this.repository.findByEmail(normalizedEmail);

    if (existing) {
      await this.repository.attachSocialAccountToUser({
        userId: existing.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        providerEmail: profile.email,
      });

      return this.createSessionForUser({
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        isSuperAdmin: existing.isSuperAdmin,
      });
    }

    const created = await this.repository.createCustomerWithSocialAccount({
      email: normalizedEmail,
      name: profile.name?.trim() || (profile.provider === "google" ? "Google User" : "Apple User"),
      passwordHash: await hash(randomUUID(), 10),
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      providerEmail: profile.email,
    });

    return this.createSessionForUser(created);
  }

  getGoogleOAuthConfig() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const appUrl = resolveAppUrl();

    if (!clientId || !clientSecret || !appUrl) {
      return null;
    }

    return {
      clientId,
      clientSecret,
      appUrl,
      redirectUri: `${appUrl}/api/identity/oauth/google/callback`,
    };
  }

  getFacebookOAuthConfig() {
    const clientId = process.env.FACEBOOK_OAUTH_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_OAUTH_CLIENT_SECRET;
    const appUrl = resolveAppUrl();

    if (!clientId || !clientSecret || !appUrl) {
      return null;
    }

    return {
      clientId,
      clientSecret,
      appUrl,
      redirectUri: `${appUrl}/api/identity/oauth/facebook/callback`,
    };
  }

  getAppleOAuthConfig() {
    const clientId = process.env.APPLE_OAUTH_CLIENT_ID;
    const teamId = process.env.APPLE_OAUTH_TEAM_ID;
    const keyId = process.env.APPLE_OAUTH_KEY_ID;
    const appUrl = resolveAppUrl();
    const privateKey = getApplePrivateKey();

    if (!clientId || !teamId || !keyId || !appUrl || !privateKey) {
      return null;
    }

    return {
      clientId,
      teamId,
      keyId,
      appUrl,
      redirectUri: `${appUrl}/api/identity/oauth/apple/callback`,
      privateKey,
    };
  }

  async createAppleClientSecret() {
    const config = this.getAppleOAuthConfig();
    if (!config) {
      return null;
    }

    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: config.keyId })
      .setIssuer(config.teamId)
      .setAudience("https://appleid.apple.com")
      .setSubject(config.clientId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(config.privateKey);
  }

  extractGoogleProfile(idToken: string): SocialAuthProfile {
    const payload = decodeJwt(idToken);

    return {
      provider: "google",
      providerAccountId: String(payload.sub ?? ""),
      email: typeof payload.email === "string" ? payload.email : null,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  }

  extractAppleProfile(idToken: string): SocialAuthProfile {
    const payload = decodeJwt(idToken);

    return {
      provider: "apple",
      providerAccountId: String(payload.sub ?? ""),
      email: typeof payload.email === "string" ? payload.email : null,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  }

  createFacebookProfile(payload: { id: string; email?: string; name?: string }): SocialAuthProfile {
    return {
      provider: "facebook",
      providerAccountId: payload.id,
      email: payload.email ?? null,
      name: payload.name ?? null,
    };
  }
}

export const identityService = new IdentityService(new IdentityRepository());
