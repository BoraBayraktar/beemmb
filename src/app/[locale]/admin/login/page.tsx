import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { Package, Truck, Receipt } from "lucide-react";

import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/auth";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { identityService } from "@/modules/identity/services/identity.service";
import { LoginForm } from "@/ui/admin/login-form";
import styles from "@/ui/admin/admin.module.css";

export default async function AdminLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? cookieStore.get(LEGACY_AUTH_COOKIE_NAME)?.value;
  const user = await identityService.getAuthenticatedUser(token);
  const socialGoogleHref = identityService.getGoogleOAuthConfig()
    ? `/api/identity/oauth/google/start?redirectTo=${encodeURIComponent(`/${locale}/admin`)}`
    : null;
  const socialAppleHref = identityService.getAppleOAuthConfig()
    ? `/api/identity/oauth/apple/start?redirectTo=${encodeURIComponent(`/${locale}/admin`)}`
    : null;

  if (user) {
    redirect(`/${locale}/admin`);
  }

  const requestedRedirect = query.redirect;
  const safeRedirect = requestedRedirect && requestedRedirect.startsWith(`/${locale}`)
    ? requestedRedirect
    : `/${locale}/admin`;

  const slides = dictionary.admin.loginSlides as Array<{
    title: string;
    description: string;
    tag: string;
  }>;
  const slideConfig = [
    { icon: Package, animClass: styles.slide1, badgeClass: styles.slideIconBadge1 },
    { icon: Truck, animClass: styles.slide2, badgeClass: styles.slideIconBadge2 },
    { icon: Receipt, animClass: styles.slide3, badgeClass: styles.slideIconBadge3 },
  ];

  return (
    <main className={styles.loginShell}>
      <section className={styles.authStage}>
        <div className={styles.loginVisualFrame}>
          <div className={styles.loginVisualGrid} aria-hidden />
          <div className={styles.loginVisualOverlay} aria-hidden />

          <div className={styles.authStageContent}>
            <div className={styles.slideStack} aria-hidden>
              {slides.map((slide, index) => {
                const config = slideConfig[index];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div key={slide.title} className={`${styles.authSlide} ${config.animClass}`}>
                    <div className={styles.slideCard}>
                      <div className={`${styles.slideIconBadge} ${config.badgeClass}`}>
                        <Icon className={styles.slideCardIcon} aria-hidden />
                      </div>
                      <div className={styles.slideCopy}>
                        <span className={styles.slideTag}>{slide.tag}</span>
                        <h3 className={styles.slideCardTitle}>{slide.title}</h3>
                        <p className={styles.slideCardText}>{slide.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.loginDots} aria-hidden>
              {slideConfig.map((config, index) => (
                <span key={index} className={styles.loginDot}>
                  <span className={`${styles.loginDotFill} ${config.animClass}`} />
                </span>
              ))}
            </div>

            <LoginForm
              locale={locale}
              redirectTo={safeRedirect}
              socialGoogleHref={socialGoogleHref}
              socialAppleHref={socialAppleHref}
              labels={{
                title: dictionary.admin.loginTitle,
                subtitle: dictionary.admin.loginSubtitle,
                email: dictionary.admin.email,
                password: dictionary.admin.password,
                submit: dictionary.admin.loginButton,
                invalidCredentials: dictionary.admin.invalidCredentials,
                loading: dictionary.common.loading,
                forgotPassword: dictionary.auth.forgotPassword,
                rememberMe: dictionary.auth.rememberMe,
                socialDivider: dictionary.auth.socialDivider,
                socialGoogle: dictionary.auth.socialGoogle,
                socialApple: dictionary.auth.socialApple,
                socialComingSoon: dictionary.auth.socialComingSoon,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
