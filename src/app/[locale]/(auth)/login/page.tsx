import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/auth";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { identityService } from "@/modules/identity/services/identity.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { AuthForm } from "@/ui/shop/auth-form";

export default async function ShopLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? cookieStore.get(LEGACY_AUTH_COOKIE_NAME)?.value;
  const user = await identityService.getAuthenticatedUser(token);
  const socialGoogleHref = identityService.getGoogleOAuthConfig()
    ? `/api/identity/oauth/google/start?redirectTo=${encodeURIComponent(`/${locale}`)}`
    : null;
  const socialAppleHref = identityService.getAppleOAuthConfig()
    ? `/api/identity/oauth/apple/start?redirectTo=${encodeURIComponent(`/${locale}`)}`
    : null;
  const socialFacebookHref = identityService.getFacebookOAuthConfig()
    ? `/api/identity/oauth/facebook/start?redirectTo=${encodeURIComponent(`/${locale}`)}`
    : null;

  if (user) {
    const canAccessAdmin = await rbacService.hasPermission(user, "admin.access");
    redirect(canAccessAdmin ? `/${locale}/admin` : `/${locale}`);
  }

  return (
    <AuthForm
      locale={locale}
      mode="login"
      redirectTo={`/${locale}`}
      switchHref="register"
      socialGoogleHref={socialGoogleHref}
      socialAppleHref={socialAppleHref}
      socialFacebookHref={socialFacebookHref}
      labels={{
        title: dictionary.auth.loginTitle,
        subtitle: dictionary.auth.loginSubtitle,
        email: dictionary.auth.email,
        password: dictionary.auth.password,
        name: dictionary.auth.name,
        submit: dictionary.auth.loginButton,
        loading: dictionary.common.loading,
        switchText: dictionary.auth.noAccount,
        switchCta: dictionary.auth.registerButton,
        invalidCredentials: dictionary.auth.invalidCredentials,
        emailExists: dictionary.auth.emailExists,
        forgotPassword: dictionary.auth.forgotPassword,
        rememberMe: dictionary.auth.rememberMe,
        socialDivider: dictionary.auth.socialDivider,
        socialGoogle: dictionary.auth.socialGoogle,
        socialApple: dictionary.auth.socialApple,
        socialFacebook: dictionary.auth.socialFacebook,
        socialComingSoon: dictionary.auth.socialComingSoon,
        passwordStrengthWeak: dictionary.auth.passwordStrengthWeak,
        passwordStrengthMedium: dictionary.auth.passwordStrengthMedium,
        passwordStrengthStrong: dictionary.auth.passwordStrengthStrong,
        heroEyebrow: dictionary.auth.heroEyebrow,
        heroTitle: dictionary.auth.loginHeroTitle,
        heroBody: dictionary.auth.loginHeroBody,
        featureFast: dictionary.auth.featureFast,
        featureSafe: dictionary.auth.featureSafe,
        featureOrders: dictionary.auth.featureOrders,
        staffLoginPrompt: dictionary.auth.staffLoginPrompt,
        staffLoginCta: dictionary.auth.staffLoginCta,
      }}
    />
  );
}
