"use client";

import {
  type FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import styles from "@/app/sign-in/sign-in.module.css";

export function SignInForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [rememberMe, setRememberMe] =
    useState(true);
  const [showPassword, setShowPassword] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } =
        await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
          rememberMe,
        });

      if (error) {
        setErrorMessage(
          error.status === 429
            ? "Too many attempts. Wait a moment and try again."
            : "The email or password is incorrect.",
        );

        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage(
        "DeskOps could not complete the sign-in request. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <div className={styles.field}>
        <label
          className={styles.label}
          htmlFor="email"
        >
          Email address
        </label>

        <input
          className={styles.input}
          id="email"
          name="email"
          type="email"
          value={email}
          autoComplete="email"
          autoFocus
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={
            errorMessage
              ? "sign-in-error"
              : undefined
          }
          placeholder="you@nusantarasystems.co.id"
          onChange={(event) => {
            setEmail(event.target.value);

            if (errorMessage) {
              setErrorMessage("");
            }
          }}
        />
      </div>

      <div className={styles.field}>
        <label
          className={styles.label}
          htmlFor="password"
        >
          Password
        </label>

        <div className={styles.passwordField}>
          <input
            className={styles.input}
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={password}
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={128}
            disabled={isSubmitting}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={
              errorMessage
                ? "sign-in-error"
                : undefined
            }
            placeholder="Enter your password"
            onChange={(event) => {
              setPassword(event.target.value);

              if (errorMessage) {
                setErrorMessage("");
              }
            }}
          />

          <button
            className={styles.passwordToggle}
            type="button"
            disabled={isSubmitting}
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            aria-pressed={showPassword}
            onClick={() => {
              setShowPassword(
                (currentValue) =>
                  !currentValue,
              );
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className={styles.options}>
        <label
          className={styles.checkboxLabel}
        >
          <input
            className={styles.checkbox}
            name="rememberMe"
            type="checkbox"
            checked={rememberMe}
            disabled={isSubmitting}
            onChange={(event) => {
              setRememberMe(
                event.target.checked,
              );
            }}
          />

          <span>Keep me signed in</span>
        </label>
      </div>

      {errorMessage ? (
        <p
          className={styles.error}
          id="sign-in-error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        className={styles.submitButton}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Signing in..."
          : "Sign in"}
      </button>
    </form>
  );
}