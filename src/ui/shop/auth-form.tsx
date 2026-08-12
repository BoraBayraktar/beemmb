"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { AppleIcon } from "@/components/icons/apple-icon";
import { FacebookIcon } from "@/components/icons/facebook-icon";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/ui/shop/auth.module.css";

type Labels = {
  title: string;
  subtitle: string;
  email: string;
  password: string;
  name: string;
  submit: string;
  loading: string;
  switchText: string;
  switchCta: string;
  invalidCredentials: string;
  emailExists: string;
  forgotPassword: string;
  rememberMe: string;
  socialDivider: string;
  socialGoogle: string;
  socialApple: string;
  socialFacebook: string;
  socialComingSoon: string;
  passwordStrengthWeak: string;
  passwordStrengthMedium: string;
  passwordStrengthStrong: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  featureFast: string;
  featureSafe: string;
  featureOrders: string;
  staffLoginPrompt?: string;
  staffLoginCta?: string;
};

type Props = {
  locale: string;
  mode: "login" | "register";
  redirectTo: string;
  switchHref: string;
  socialGoogleHref?: string | null;
  socialAppleHref?: string | null;
  socialFacebookHref?: string | null;
  labels: Labels;
};

const heroIcon = {
  login: ShieldCheck,
  register: Sparkles,
} as const;

const checkboxClassName = "h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-2 focus:ring-neutral-300";

export function AuthForm({
  locale,
  mode,
  redirectTo,
  switchHref,
  socialGoogleHref,
  socialAppleHref,
  socialFacebookHref,
  labels,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(mode === "register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const HeroIcon = heroIcon[mode];

  const passwordScore = [
    password.length >= 6,
    /[A-Z]/.test(password) || /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password) || password.length >= 10,
  ].filter(Boolean).length;

  const passwordStrengthLabel = passwordScore <= 1
    ? labels.passwordStrengthWeak
    : passwordScore === 2
      ? labels.passwordStrengthMedium
      : labels.passwordStrengthStrong;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === "register" ? "/api/identity/register" : "/api/identity/login";
      const body = mode === "register"
        ? { name, email, password, rememberMe }
        : { email, password, rememberMe };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 409) {
          setError(labels.emailExists);
          return;
        }

        setError(labels.invalidCredentials);
        return;
      }

      const data = await response.json().catch(() => null);
      const target = data?.canAccessAdmin ? `/${locale}/admin` : redirectTo;
      router.push(target);
      router.refresh();
    } catch {
      setError(labels.invalidCredentials);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.authShell}>
      <section className={styles.visualPane}>
        <div className={styles.visualFrame}>
          <div className={styles.visualBackdrop} />
          <div className={styles.visualGrid} />

          <div className={styles.visualContent}>
            <span className={styles.heroEyebrow}>{labels.heroEyebrow}</span>
            <div className={styles.heroBadge}>
              <HeroIcon className="h-4 w-4" />
              <span>BEEMMB</span>
            </div>
            <h1 className={styles.heroTitle}>{labels.heroTitle}</h1>
            <p className={styles.heroBody}>{labels.heroBody}</p>

            <div className={styles.featureGrid}>
              <article className={styles.featureCard}>
                <CheckCircle2 className="h-4 w-4" />
                <span>{labels.featureFast}</span>
              </article>
              <article className={styles.featureCard}>
                <ShieldCheck className="h-4 w-4" />
                <span>{labels.featureSafe}</span>
              </article>
              <article className={styles.featureCard}>
                <Sparkles className="h-4 w-4" />
                <span>{labels.featureOrders}</span>
              </article>
            </div>
          </div>

          <div className={styles.metricStack} aria-hidden>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>24/7</span>
              <strong>Access</strong>
            </div>
            <div className={styles.metricCardAccent}>
              <span className={styles.metricLabel}>Secure</span>
              <strong>Customer Identity</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.formPane}>
        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardBadge}>{mode === "login" ? labels.forgotPassword : labels.switchCta}</div>
            <h2 className={styles.authTitle}>{labels.title}</h2>
            <p className={styles.authSubtitle}>{labels.subtitle}</p>
          </div>

          <form className={styles.authForm} onSubmit={handleSubmit}>
            <div className={styles.socialStack}>
              <p className={styles.socialDivider}>{labels.socialDivider}</p>
              <div className={styles.socialGrid}>
                {socialGoogleHref ? (
                  <Link href={socialGoogleHref} className={styles.socialButton}>
                    <GoogleIcon className="h-4 w-4" />
                    <span>{labels.socialGoogle}</span>
                  </Link>
                ) : (
                  <Button type="button" variant="ghost" className={styles.socialButton} disabled>
                    <GoogleIcon className="h-4 w-4" />
                    <span>{labels.socialGoogle}</span>
                    <small>{labels.socialComingSoon}</small>
                  </Button>
                )}
                {socialAppleHref ? (
                  <Link href={socialAppleHref} className={styles.socialButton}>
                    <AppleIcon className="h-4 w-4" />
                    <span>{labels.socialApple}</span>
                  </Link>
                ) : (
                  <Button type="button" variant="ghost" className={styles.socialButton} disabled>
                    <AppleIcon className="h-4 w-4" />
                    <span>{labels.socialApple}</span>
                    <small>{labels.socialComingSoon}</small>
                  </Button>
                )}
                {socialFacebookHref ? (
                  <Link href={socialFacebookHref} className={styles.socialButton}>
                    <FacebookIcon className="h-4 w-4" />
                    <span>{labels.socialFacebook}</span>
                  </Link>
                ) : (
                  <Button type="button" variant="ghost" className={styles.socialButton} disabled>
                    <FacebookIcon className="h-4 w-4" />
                    <span>{labels.socialFacebook}</span>
                    <small>{labels.socialComingSoon}</small>
                  </Button>
                )}
              </div>
            </div>

            {mode === "register" ? (
              <div className={styles.fieldBlock}>
                <Label htmlFor="auth-name">{labels.name}</Label>
                <div className={styles.inputWrap}>
                  <UserRound className={styles.inputIcon} />
                  <Input
                    id="auth-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    required
                    className={styles.authInput}
                  />
                </div>
              </div>
            ) : null}

            <div className={styles.fieldBlock}>
              <Label htmlFor="auth-email">{labels.email}</Label>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} />
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className={styles.authInput}
                />
              </div>
              {mode === "register" && password ? (
                <div className={styles.passwordStrength}>
                  <div className={styles.passwordStrengthBars} aria-hidden>
                    <span className={`${styles.passwordStrengthBar} ${passwordScore >= 1 ? styles.passwordStrengthWeakBar : ""}`} />
                    <span className={`${styles.passwordStrengthBar} ${passwordScore >= 2 ? styles.passwordStrengthMediumBar : ""}`} />
                    <span className={`${styles.passwordStrengthBar} ${passwordScore >= 3 ? styles.passwordStrengthStrongBar : ""}`} />
                  </div>
                  <span>{passwordStrengthLabel}</span>
                </div>
              ) : null}
            </div>

            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className={checkboxClassName}
                />
                <span>{labels.rememberMe}</span>
              </label>
            </div>

            <div className={styles.fieldBlock}>
              <div className={styles.passwordHeader}>
                <Label htmlFor="auth-password">{labels.password}</Label>
                {mode === "login" ? (
                  <Link href={`/${locale}/forgot-password`} className={styles.inlineLink}>
                    {labels.forgotPassword}
                  </Link>
                ) : null}
              </div>
              <div className={styles.inputWrap}>
                <KeyRound className={styles.inputIcon} />
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                  className={styles.authInputWithButton}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={styles.visibilityToggle}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error ? <p className={styles.authError}>{error}</p> : null}

            <Button type="submit" disabled={loading} className={styles.primaryButton}>
              <span>{loading ? labels.loading : labels.submit}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className={styles.authSwitch}>
              {labels.switchText}{" "}
              <Link href={`/${locale}/${switchHref}`}>{labels.switchCta}</Link>
            </p>

            {mode === "login" && labels.staffLoginPrompt && labels.staffLoginCta ? (
              <p className={styles.authSwitch}>
                {labels.staffLoginPrompt}{" "}
                <Link href={`/${locale}/admin/login`}>{labels.staffLoginCta}</Link>
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
