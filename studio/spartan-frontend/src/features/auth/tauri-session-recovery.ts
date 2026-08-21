// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

type SessionRecoveryDependencies = {
  clearSession: () => void;
  authenticate: () => Promise<boolean>;
  hasSession: () => boolean;
};

/**
 * Coalesce a burst of rejected desktop requests into one session replacement.
 *
 * Clearing in each caller is unsafe: a late caller can erase the token stored
 * by the authentication promise all callers share.  Keep the clear and the
 * exchange inside the same single-flight operation instead.
 */
export function createTauriSessionRecovery({
  clearSession,
  authenticate,
  hasSession,
}: SessionRecoveryDependencies): () => Promise<boolean> {
  let inflight: Promise<boolean> | null = null;

  return function recoverTauriSession(): Promise<boolean> {
    if (inflight) return inflight;

    const recovery = (async () => {
      clearSession();

      // An app-start authentication may already be settling when recovery
      // begins.  If joining it reports success without leaving a token, force
      // one fresh exchange after that shared promise has finished.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if ((await authenticate()) && hasSession()) return true;
      }
      return false;
    })();

    inflight = recovery.finally(() => {
      inflight = null;
    });
    return inflight;
  };
}
