"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import styles from "./sign-out-button.module.css";

export function SignOutButton() {
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setErrorMessage("");
    setIsSigningOut(true);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace("/sign-in");
            router.refresh();
          },
          onError: () => {
            setErrorMessage(
              "Unable to sign out. Try again.",
            );
          },
        },
      });
    } catch {
      setErrorMessage(
        "Unable to sign out. Try again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        {isSigningOut
          ? "Signing out..."
          : "Sign out"}
      </button>

      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}