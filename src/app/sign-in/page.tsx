import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getWorkspaceSession } from "@/features/auth/server/workspace-session";

import styles from "./sign-in.module.css";

export const metadata: Metadata = {
  title: "Sign in | DeskOps",
  description:
    "Sign in to your DeskOps workspace.",
};

export default async function SignInPage() {
  const currentWorkspace =
    await getWorkspaceSession();

  if (currentWorkspace?.authSession) {
    redirect(
      currentWorkspace.membership
        ? "/"
        : "/access-denied",
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span
            aria-hidden="true"
            className={styles.brandMark}
          >
            D
          </span>

          <span className={styles.brandName}>
            DeskOps
          </span>
        </div>

        <p className={styles.productContext}>
          IT operations workspace
        </p>
      </header>

      <section className={styles.content}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.organization}>
                IT Service &amp; Asset Management
            </p>

            <h1>Sign in</h1>

            <p className={styles.description}>
              Enter your work email and password
              to continue.
            </p>
          </div>

          <SignInForm />
        </div>

        <p className={styles.helpText}>
          Need access? Contact your IT
          administrator.
        </p>
      </section>

      <footer className={styles.footer}>
        DeskOps internal system
      </footer>
    </main>
  );
}