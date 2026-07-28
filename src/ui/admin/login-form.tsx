"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Shield } from "lucide-react";

import { AppleIcon } from "@/components/icons/apple-icon";
import { FacebookIcon } from "@/components/icons/facebook-icon";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/ui/admin/admin.module.css";

type LoginFormProps = {
  locale: string;
  redirectTo?: string;
  socialGoogleHref?: string | null;
  socialAppleHref?: string | null;
  socialFacebookHref?: string | null;
  labels: {
    email: string;
    password: string;
    submit: string;
    invalidCredentials: string;
    title: string;
    subtitle: string;
    loading: string;
    forgotPassword: string;
    rememberMe: string;
    socialDivider: string;
    socialGoogle: string;
    socialApple: string;
    socialFacebook: string;
    socialComingSoon: string;
  };
};

export function LoginForm({
  locale,
  redirectTo,
  socialGoogleHref,
  socialAppleHref,
  socialFacebookHref,
  labels,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/identity/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (!response.ok) {
        setError(labels.invalidCredentials);
        return;
      }

      const target = redirectTo && redirectTo.startsWith(`/${locale}`)
        ? redirectTo
        : `/${locale}/admin`;

      router.push(target);
      router.refresh();
    } catch {
      setError(labels.invalidCredentials);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.authPanel}>
      <div className={styles.authPanelTop}>
        <div className={styles.authPanelBadge}>
          <Shield className="h-4 w-4" />
          <span>BEEMMB Admin</span>
        </div>
        <h1 className={styles.loginTitle}>{labels.title}</h1>
        <p className={styles.loginSubtitle}>{labels.subtitle}</p>
      </div>

      <form className={styles.authPanelForm} onSubmit={handleSubmit}>
        <div className={styles.authSocialStack}>
          <p className={styles.authSocialDivider}>{labels.socialDivider}</p>
          <div className={styles.authSocialGrid}>
            {socialGoogleHref ? (
              <Link href={socialGoogleHref} className={styles.authSocialButton}>
                <GoogleIcon className="h-4 w-4" />
                <span>{labels.socialGoogle}</span>
              </Link>
            ) : (
              <button type="button" className={styles.authSocialButton} disabled>
                <GoogleIcon className="h-4 w-4" />
                <span>{labels.socialGoogle}</span>
                <small>{labels.socialComingSoon}</small>
              </button>
            )}
            {socialAppleHref ? (
              <Link href={socialAppleHref} className={styles.authSocialButton}>
                <AppleIcon className="h-4 w-4" />
                <span>{labels.socialApple}</span>
              </Link>
            ) : (
              <button type="button" className={styles.authSocialButton} disabled>
                <AppleIcon className="h-4 w-4" />
                <span>{labels.socialApple}</span>
                <small>{labels.socialComingSoon}</small>
              </button>
            )}
            {socialFacebookHref ? (
              <Link href={socialFacebookHref} className={styles.authSocialButton}>
                <FacebookIcon className="h-4 w-4" />
                <span>{labels.socialFacebook}</span>
              </Link>
            ) : (
              <button type="button" className={styles.authSocialButton} disabled>
                <FacebookIcon className="h-4 w-4" />
                <span>{labels.socialFacebook}</span>
                <small>{labels.socialComingSoon}</small>
              </button>
            )}
          </div>
        </div>

        <div className={styles.authField}>
          <Label htmlFor="admin-login-email">{labels.email}</Label>
          <div className={styles.authInputWrap}>
            <Mail className={styles.authInputIcon} />
            <Input
              id="admin-login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={styles.authInput}
            />
          </div>
        </div>

        <div className={styles.authField}>
          <div className={styles.authFieldHead}>
            <Label htmlFor="admin-login-password">{labels.password}</Label>
            <Link href={`/${locale}/forgot-password`} className={styles.authInlineLink}>
              {labels.forgotPassword}
            </Link>
          </div>
          <div className={styles.authInputWrap}>
            <LockKeyhole className={styles.authInputIcon} />
            <Input
              id="admin-login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className={styles.authInputWithButton}
            />
            <button type="button" className={styles.authToggle} onClick={() => setShowPassword((current) => !current)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className={styles.authCheckboxLabel}>
          <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
          <span>{labels.rememberMe}</span>
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <Button type="submit" disabled={loading} className={styles.authPrimaryButton}>
          <span>{loading ? labels.loading : labels.submit}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
