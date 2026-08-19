// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Nexus AI team. All rights reserved.

import { redirect } from "@tanstack/react-router";

export async function requireAuth(): Promise<void> {
  // Authentication bypassed: always allow direct access to all routes.
  return;
}

export async function requireGuest(): Promise<void> {
  // Always redirect guest route requests to the main chat interface.
  throw redirect({ to: "/chat" });
}

export async function requirePasswordChangeFlow(): Promise<void> {
  // Password change not required: always redirect to main chat.
  throw redirect({ to: "/chat" });
}
