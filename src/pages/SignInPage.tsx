import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Field, PasswordInput, TextInput } from "@/components/ui/Field";
import { useAccount } from "@/hooks/useAccount";
import { applyMeta } from "@/lib/head";
import { postForgotPassword } from "@/lib/api/endpoints/auth";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginValues,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "@/lib/validation/authSchemas";

type Mode = "signin" | "request" | "confirm";

export function SignInPage() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const resetToken = params.get("token");
  const mode: Mode = pathname.startsWith("/reset")
    ? resetToken
      ? "confirm"
      : "request"
    : "signin";

  useEffect(() => {
    if (mode === "confirm")
      return applyMeta({ title: "Set a new password", noindex: true });
    if (mode === "request")
      return applyMeta({ title: "Forgot your password?", noindex: true });
    return applyMeta({
      title: "Sign in",
      description: "Back to your panel, your entries and your traffic.",
      noindex: true,
    });
  }, [mode]);

  if (mode === "confirm") {
    return (
      <ResetConfirmView
        token={resetToken!}
        onSuccess={() => navigate("/panel")}
      />
    );
  }
  if (mode === "request") {
    return <ForgotPasswordView onBack={() => navigate("/signin")} />;
  }
  return (
    <SignInView
      onSuccess={() => navigate("/panel")}
      onForgot={() => navigate("/reset")}
    />
  );
}

/* ── Sign-in form ─────────────────────────────────────────────────────── */

function SignInView({
  onSuccess,
  onForgot,
}: {
  onSuccess: () => void;
  onForgot: () => void;
}) {
  const { signIn } = useAccount();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });
  const {
    formState: { errors, isSubmitting },
  } = form;
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(data: LoginValues) {
    setServerError(null);
    const result = await signIn(data.email, data.password);
    if (!result.ok) {
      setServerError(result.reason);
      return;
    }
    onSuccess();
  }

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
      <h1 className="display text-[clamp(1.875rem,5vw,2.75rem)]">Sign in</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Back to your panel, your entries and your traffic.
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Field label="Email" required error={errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              autoComplete="username"
              aria-describedby={describedBy}
              invalid={invalid}
              value={form.watch("email") ?? ""}
              placeholder="you@studio.com"
              onChange={(e) =>
                form.setValue("email", e.target.value, {
                  shouldValidate: isSubmitting,
                })
              }
            />
          )}
        </Field>

        <Field label="Password" required error={errors.password?.message}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="current-password"
              aria-describedby={describedBy}
              invalid={invalid}
              value={form.watch("password") ?? ""}
              onChange={(e) =>
                form.setValue("password", e.target.value, {
                  shouldValidate: isSubmitting,
                })
              }
            />
          )}
        </Field>

        {serverError && (
          <p role="alert" className="text-sm font-medium text-pop-pink">
            {serverError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working…" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={onForgot}
            className="cursor-pointer font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
          >
            Forgot your password?
          </button>
        </div>
      </form>
    </Container>
  );
}

/* ── Forgot-password form ─────────────────────────────────────────────── */

function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const {
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(data: ForgotPasswordValues) {
    try {
      await postForgotPassword(data.email);
      setSentEmail(data.email);
      setSent(true);
    } catch {
      form.setError("email", {
        message: "Could not send reset link — try again.",
      });
    }
  }

  if (sent) {
    return (
      <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
        <h1 className="display text-[clamp(1.875rem,5vw,2.75rem)]">
          Check your inbox
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          We sent a reset link to <strong>{sentEmail}</strong>. It expires in 1
          hour.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-8 cursor-pointer self-start font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
        >
          Back to sign in
        </button>
      </Container>
    );
  }

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
      <h1 className="display text-[clamp(1.875rem,5vw,2.75rem)]">
        Forgot your password?
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Enter your email and we'll send a reset link.
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Field label="Email" required error={errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              autoComplete="username"
              aria-describedby={describedBy}
              invalid={invalid}
              value={form.watch("email") ?? ""}
              placeholder="you@studio.com"
              onChange={(e) =>
                form.setValue("email", e.target.value, {
                  shouldValidate: isSubmitting,
                })
              }
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
          >
            Back to sign in
          </button>
        </div>
      </form>
    </Container>
  );
}

/* ── Reset-confirm form ───────────────────────────────────────────────── */

function ResetConfirmView({
  token,
  onSuccess,
}: {
  token: string;
  onSuccess: () => void;
}) {
  const { confirmPasswordReset } = useAccount();
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });
  const {
    formState: { errors, isSubmitting },
  } = form;
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(data: ResetPasswordValues) {
    setServerError(null);
    const result = await confirmPasswordReset(token, data.password);
    if (!result.ok) {
      setServerError(result.reason);
      return;
    }
    onSuccess();
  }

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
      <h1 className="display text-[clamp(1.875rem,5vw,2.75rem)]">
        Set a new password
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Choose a new password for your account.
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Field label="New password" required error={errors.password?.message}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              aria-describedby={describedBy}
              invalid={invalid}
              value={form.watch("password") ?? ""}
              placeholder="At least 10 characters"
              onChange={(e) =>
                form.setValue("password", e.target.value, {
                  shouldValidate: isSubmitting,
                })
              }
            />
          )}
        </Field>

        <Field
          label="Repeat new password"
          required
          error={errors.confirmPassword?.message}
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              aria-describedby={describedBy}
              invalid={invalid}
              value={form.watch("confirmPassword") ?? ""}
              onChange={(e) =>
                form.setValue("confirmPassword", e.target.value, {
                  shouldValidate: isSubmitting,
                })
              }
            />
          )}
        </Field>

        {serverError && (
          <p role="alert" className="text-sm font-medium text-pop-pink">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? "Working…" : "Set password and sign in"}
        </Button>
      </form>
    </Container>
  );
}
