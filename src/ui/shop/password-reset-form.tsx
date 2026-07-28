"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/ui/shop/auth.module.css";

type PasswordResetFormProps = {
  locale: string;
  token: string;
  labels: {
    title: string;
    subtitle: string;
    password: string;
    confirmPassword: string;
    submit: string;
    success: string;
    invalidToken: string;
    mismatch: string;
    failure: string;
    backToLogin: string;
    loading: string;
    heroEyebrow: string;
    heroTitle: string;
    heroBody: string;
    passwordStrengthWeak: string;
    passwordStrengthMedium: string;
    passwordStrengthStrong: string;
  };
};

export function PasswordResetForm({ locale, token, labels }: PasswordResetFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    setError(null);
    setSuccess(null);

    if (!token) {
      setError(labels.invalidToken);
      return;
    }

    if (password !== confirmPassword) {
      setError(labels.mismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/identity/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        setError(response.status === 400 ? labels.invalidToken : labels.failure);
        return;
      }

      setSuccess(labels.success);
      window.setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 1200);
    } catch {
      setError(labels.failure);
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
              <ShieldCheck className="h-4 w-4" />
              <span>BEEMMB</span>
            </div>
            <h1 className={styles.heroTitle}>{labels.heroTitle}</h1>
            <p className={styles.heroBody}>{labels.heroBody}</p>
          </div>
        </div>
      </section>

      <section className={styles.formPane}>
        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardBadge}>{labels.backToLogin}</div>
            <h2 className={styles.authTitle}>{labels.title}</h2>
            <p className={styles.authSubtitle}>{labels.subtitle}</p>
          </div>

          <form className={styles.authForm} onSubmit={handleSubmit}>
            <div className={styles.fieldBlock}>
              <Label htmlFor="reset-password">{labels.password}</Label>
              <div className={styles.inputWrap}>
                <KeyRound className={styles.inputIcon} />
                <Input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                  className={styles.authInputWithButton}
                />
                <Button type="button" variant="ghost" size="icon" className={styles.visibilityToggle} onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {password ? (
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

            <div className={styles.fieldBlock}>
              <Label htmlFor="reset-password-confirm">{labels.confirmPassword}</Label>
              <div className={styles.inputWrap}>
                <KeyRound className={styles.inputIcon} />
                <Input
                  id="reset-password-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                  className={styles.authInputWithButton}
                />
                <Button type="button" variant="ghost" size="icon" className={styles.visibilityToggle} onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Şifreyi gizle" : "Şifreyi göster"}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error ? <p className={styles.authError}>{error}</p> : null}
            {success ? <p className={styles.authSuccess}><ShieldCheck className="h-4 w-4" /><span>{success}</span></p> : null}

            <Button type="submit" disabled={loading} className={styles.primaryButton}>
              <span>{loading ? labels.loading : labels.submit}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className={styles.authSwitch}>
              <Link href={`/${locale}/login`}>{labels.backToLogin}</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
