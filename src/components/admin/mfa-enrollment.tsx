"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";

import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type EnrollmentState = Readonly<{
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}>;

type MfaEnrollmentProps = Readonly<{
  next: string;
}>;

function qrSource(value: string): string {
  return value.startsWith("data:") ? value : `data:image/svg+xml,${encodeURIComponent(value)}`;
}

function withTimeout<T>(promise: PromiseLike<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("MFA request timed out.")),
      milliseconds,
    );

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (reason: unknown) => {
        window.clearTimeout(timeout);
        reject(reason instanceof Error ? reason : new Error("MFA request failed."));
      },
    );
  });
}

export function MfaEnrollment({ next }: MfaEnrollmentProps) {
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const client = getBrowserSupabaseClient();
        const { error: factorsError } = await withTimeout(client.auth.mfa.listFactors(), 10_000);
        if (factorsError) {
          throw factorsError;
        }

        const { data: enrolled, error: enrollError } = await withTimeout(
          client.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: "RENZ staff authenticator",
          }),
          10_000,
        );

        if (enrollError || !enrolled?.totp) {
          throw enrollError ?? new Error("MFA enrollment did not return setup details.");
        }

        if (active) {
          setEnrollment({
            factorId: enrolled.id,
            qrCode: enrolled.totp.qr_code,
            secret: enrolled.totp.secret,
            uri: enrolled.totp.uri,
          });
          setBusy(false);
        }
      } catch {
        if (active) {
          setError(
            "The authenticator setup could not be loaded. Check the local Auth service and try again.",
          );
          setBusy(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment || !/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your authenticator.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const client = getBrowserSupabaseClient();
      const { error: verifyError } = await withTimeout(
        client.auth.mfa.challengeAndVerify({
          factorId: enrollment.factorId,
          code,
        }),
        10_000,
      );

      if (verifyError) {
        throw verifyError;
      }

      const activated = await withTimeout(
        Promise.resolve(client.rpc("activate_current_profile")),
        10_000,
      );
      if (activated.error || activated.data !== true) {
        throw activated.error ?? new Error("Profile activation did not complete.");
      }

      const audit = await withTimeout(
        Promise.resolve(
          client.rpc("record_audit_event", {
            event_action: "mfa.enroll",
            event_entity_type: "auth_factor",
            event_entity_id: enrollment.factorId,
            event_outcome: "success",
            event_metadata: {},
          }),
        ),
        10_000,
      );
      if (audit.error) {
        throw audit.error;
      }

      setEnrollment(null);
      setCode("");
      window.location.assign(next);
    } catch {
      setError("The verification could not be completed. Check the code and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="admin-form">
      {busy && !enrollment ? <p role="status">Preparing authenticator setup…</p> : null}
      {enrollment ? (
        <>
          <div className="mfa-qr-frame">
            <Image
              alt="QR code for the RENZ staff authenticator"
              height={240}
              src={qrSource(enrollment.qrCode)}
              unoptimized
              width={240}
            />
          </div>
          <p className="field-help">
            Scan the QR code, or enter this one-time setup secret manually. It will not be shown
            again after verification.
          </p>
          <code className="mfa-secret">{enrollment.secret}</code>
          <p className="field-help">Manual setup URI: {enrollment.uri}</p>
          <form
            noValidate
            onSubmit={(event) => {
              void verify(event);
            }}
          >
            <div className="field-group">
              <label htmlFor="mfa-enrollment-code">Authenticator code</label>
              <input
                autoComplete="one-time-code"
                autoFocus
                id="mfa-enrollment-code"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                pattern="[0-9]{6}"
                required
                type="text"
                value={code}
              />
            </div>
            <button className="admin-button admin-button-primary" disabled={busy} type="submit">
              {busy ? "Verifying…" : "Verify authenticator"}
            </button>
          </form>
        </>
      ) : null}
      {error && !enrollment ? (
        <button
          className="admin-button"
          onClick={() => {
            setError(null);
            setBusy(true);
            setAttempt((value) => value + 1);
          }}
          type="button"
        >
          Try setup again
        </button>
      ) : null}
      <p aria-live="polite" className="form-message form-message-error">
        {error ?? ""}
      </p>
    </div>
  );
}
