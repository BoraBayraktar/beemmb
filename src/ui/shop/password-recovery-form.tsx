"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LifeBuoy, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/ui/shop/auth.module.css";

type PasswordRecoveryFormProps = {
  locale: string;
  labels: {
    title: string;
    subtitle: string;
    email: string;
    submit: string;
    success: string;
    failure: string;
    backToLogin: string;
    loading: string;
    heroEyebrow: string;
    heroTitle: string;
    heroBody: string;
  };
};

export function PasswordRecoveryForm({ locale, labels }: PasswordRecoveryFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/identity/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, locale }),
      });

      if (!response.ok) {
        setError(labels.failure);
        return;
      }

      setSuccess(labels.success);
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
              <LifeBuoy className="h-4 w-4" />
              <span>BEEMMB</span>
            </div>
            <h1 className={styles.heroTitle}>{labels.heroTitle}</h1>
            <p className={styles.heroBody}>{labels.heroBody}</p>
          </div>
          <div className={styles.metricStack} aria-hidden>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>30 min</span>
              <strong>Valid Link</strong>
            </div>
            <div className={styles.metricCardAccent}>
              <span className={styles.metricLabel}>Protected</span>
              <strong>Reset Flow</strong>
            </div>
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
              <Label htmlFor="recovery-email">{labels.email}</Label>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} />
                <Input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className={styles.authInput}
                />
              </div>
            </div>

            {error ? <p className={styles.authError}>{error}</p> : null}
            {success ? (
              <p className={styles.authSuccess}>
                <ShieldCheck className="h-4 w-4" />
                <span>{success}</span>
              </p>
            ) : null}

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
