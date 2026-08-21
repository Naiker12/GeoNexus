// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import assert from "node:assert/strict";
import test from "node:test";

import { createTauriSessionRecovery } from "../src/features/auth/tauri-session-recovery.ts";

test("concurrent desktop recoveries cannot erase the replacement session", async () => {
  let clears = 0;
  let exchanges = 0;
  let hasSession = true;
  let releaseExchange: (() => void) | undefined;
  const exchangeStarted = new Promise<void>((resolve) => {
    releaseExchange = resolve;
  });

  const recover = createTauriSessionRecovery({
    clearSession: () => {
      clears += 1;
      hasSession = false;
    },
    hasSession: () => hasSession,
    authenticate: async () => {
      exchanges += 1;
      await exchangeStarted;
      hasSession = true;
      return true;
    },
  });

  const attempts = [recover(), recover(), recover(), recover()];
  releaseExchange?.();

  assert.deepEqual(await Promise.all(attempts), [true, true, true, true]);
  assert.equal(clears, 1);
  assert.equal(exchanges, 1);
  assert.equal(hasSession, true);
});

test("a joined authentication that stored no token is exchanged again", async () => {
  let exchanges = 0;
  let hasSession = false;
  const recover = createTauriSessionRecovery({
    clearSession: () => {
      hasSession = false;
    },
    hasSession: () => hasSession,
    authenticate: async () => {
      exchanges += 1;
      if (exchanges === 2) hasSession = true;
      return true;
    },
  });

  assert.equal(await recover(), true);
  assert.equal(exchanges, 2);
});
