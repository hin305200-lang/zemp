import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { parseUnknownError, signupRequest } from "../features/auth/api";
import { AuthLayout } from "../features/auth/AuthLayout";
import { PasswordToggle } from "../features/auth/PasswordToggle";
import { usePasswordVisible } from "../features/auth/usePasswordVisible";
import { signupFormSchema, type SignupFormValues } from "../features/auth/schemas";
import { clearClientAuth, getToken, DEMO_LOCAL, getSession, goToMarketplace } from "../features/auth/session";

export function SignupPage() {
  const password = usePasswordVisible();
  const confirm = usePasswordVisible();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirm: "" },
  });
  const mutation = useMutation({
    mutationFn: signupRequest,
    onSuccess: () => {
      goToMarketplace();
    },
  });

  useEffect(() => {
    document.title = "Open account — Zemp & Partner";
    const token = getToken();
    if (token === DEMO_LOCAL) {
      clearClientAuth();
      return;
    }
    if (getSession()) goToMarketplace();
  }, []);

  const firstError =
    form.formState.errors.name?.message
    || form.formState.errors.email?.message
    || form.formState.errors.password?.message
    || form.formState.errors.confirm?.message
    || (mutation.isError ? parseUnknownError(mutation.error, "Account could not be created.") : "");

  return (
    <AuthLayout>
      <main className="auth">
        <div className="auth-card">
          <h1>Open account</h1>
          <p className="lead">One account. Then the bond book: senior notes, covered bonds and selected subordinated issues.</p>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => {
              mutation.reset();
              mutation.mutate(values);
            })}
          >
            {firstError ? <p className="auth-error">{firstError}</p> : <p className="auth-error" hidden />}
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" type="text" autoComplete="name" {...form.register("name")} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" {...form.register("email")} />
            </div>
            <div className="field">
              <label htmlFor="phone">
                Phone <span style={{ color: "var(--mut)", fontWeight: 500 }}>(optional)</span>
              </label>
              <input id="phone" type="tel" autoComplete="tel" {...form.register("phone")} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="pw-wrap">
                <input id="password" type={password.inputType} autoComplete="new-password" {...form.register("password")} />
                <PasswordToggle show={password.show} onToggle={password.toggle} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <div className="pw-wrap">
                <input id="confirm" type={confirm.inputType} autoComplete="new-password" {...form.register("confirm")} />
                <PasswordToggle show={confirm.show} onToggle={confirm.toggle} />
              </div>
            </div>
            <button className="auth-submit" type="submit" disabled={mutation.isPending}>
              Create account
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </AuthLayout>
  );
}
