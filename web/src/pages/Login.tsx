import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { loginRequest, parseUnknownError } from "../features/auth/api";
import { AuthLayout } from "../features/auth/AuthLayout";
import { PasswordToggle } from "../features/auth/PasswordToggle";
import { usePasswordVisible } from "../features/auth/usePasswordVisible";
import { loginFormSchema, type LoginFormValues } from "../features/auth/schemas";
import { goToCrm, goToMarketplace, hasLiveSession } from "../features/auth/session";

export function LoginPage() {
  const password = usePasswordVisible();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      if (result.staff) {
        goToCrm();
        return;
      }
      goToMarketplace();
    },
  });

  useEffect(() => {
    document.title = "Log in — Zemp & Partner";
    if (hasLiveSession()) goToMarketplace();
  }, []);

  const banner = form.formState.errors.email?.message
    || form.formState.errors.password?.message
    || (mutation.isError ? parseUnknownError(mutation.error, "Sign-in failed.") : "");

  return (
    <AuthLayout>
      <main className="auth">
        <div className="auth-card">
          <h1>Log in</h1>
          <p className="lead">Sign in to open the marketplace.</p>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => {
              mutation.reset();
              mutation.mutate(values);
            })}
          >
            {banner ? <p className="auth-error">{banner}</p> : <p className="auth-error" hidden />}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="text"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                {...form.register("email")}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="pw-wrap">
                <input id="password" type={password.inputType} autoComplete="off" {...form.register("password")} />
                <PasswordToggle show={password.show} onToggle={password.toggle} />
              </div>
            </div>
            <button className="auth-submit" type="submit" disabled={mutation.isPending}>
              Log in
            </button>
          </form>
          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Open account</Link>
          </p>
        </div>
      </main>
    </AuthLayout>
  );
}
