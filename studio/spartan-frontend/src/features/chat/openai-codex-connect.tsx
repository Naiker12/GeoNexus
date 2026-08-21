// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";
import { openLink } from "@/lib/open-link";
import { useEffect, useRef, useState } from "react";
import {
  cancelCodexOAuthFlow,
  completeCodexOAuth,
  disconnectCodexOAuth,
  getCodexOAuthFlow,
  startCodexOAuth,
  type CodexOAuthFlow,
  type ProviderAuthStatus,
} from "./api/providers-api";

export function isTrustedCodexAuthUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.origin === "https://auth.openai.com" &&
      (url.pathname === "/oauth/authorize" || url.pathname === "/codex/device") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

interface Props {
  providerId: string | null;
  authStatus?: ProviderAuthStatus;
  onChanged: () => void | Promise<void>;
  ensureProvider?: () => Promise<string>;
  initialFlow?: CodexOAuthFlow | null;
}

export function OpenAICodexConnect({
  providerId,
  authStatus,
  onChanged,
  ensureProvider,
  initialFlow = null,
}: Props) {
  const t = useT();
  const [flow, setFlow] = useState<CodexOAuthFlow | null>(initialFlow);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [activeProviderId, setActiveProviderId] = useState(providerId);
  const [locallyDisconnected, setLocallyDisconnected] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (providerId) setActiveProviderId(providerId);
  }, [providerId]);
  useEffect(() => {
    if (!flow || flow.status !== "pending" || !activeProviderId) return;
    const delay = flow.method === "device" ? 2500 : 1500;
    const timer = window.setInterval(() => {
      if (Date.now() >= flow.expires_at * 1000) {
        setFlow((current) => current ? {
          ...current,
          status: "error",
          message: t("chat.providersDialog.authorizationExpired"),
        } : current);
        setError(t("chat.providersDialog.authorizationExpired"));
        return;
      }
      void getCodexOAuthFlow(activeProviderId, flow.flow_id)
        .then((next) => {
          if (!mounted.current) return;
          setFlow(next);
          if (next.status === "connected") void onChanged();
          if (next.status === "error") setError(next.message || "Authorization failed.");
        })
        .catch((cause) => mounted.current && setError(cause instanceof Error ? cause.message : "Authorization failed."));
    }, delay);
    return () => window.clearInterval(timer);
  }, [flow, activeProviderId, onChanged, t]);

  async function start(method: "browser" | "device") {
    setBusy(true);
    setError("");

    setLocallyDisconnected(false);
    try {
      const resolvedProviderId = activeProviderId ?? await ensureProvider?.();
      if (!resolvedProviderId) {
        throw new Error("Could not create the ChatGPT connection.");
      }
      setActiveProviderId(resolvedProviderId);
      const next = await startCodexOAuth(resolvedProviderId, method);
      setFlow(next);
      const url = next.authorization_url || next.verification_url;
      if (url) {
        if (!isTrustedCodexAuthUrl(url)) throw new Error("The authorization URL was not trusted.");
        openLink(url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authorization failed.");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!flow || !activeProviderId || !callbackUrl.trim()) return;
    setBusy(true);
    setError("");
    try {
      const next = await completeCodexOAuth(activeProviderId, flow.flow_id, callbackUrl.trim());
      setFlow(next);

      setLocallyDisconnected(false);
      setCallbackUrl("");
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authorization failed.");
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!flow || !activeProviderId || flow.status !== "pending") return;
    setBusy(true);
    setError("");
    try {
      await cancelCodexOAuthFlow(activeProviderId, flow.flow_id);
      setFlow({ ...flow, status: "cancelled", message: "Authorization cancelled." });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cancellation failed.");
    } finally {
      setBusy(false);
    }
  }



  async function disconnect() {
    if (!activeProviderId) return;
    setBusy(true);
    setError("");
    try {
      await disconnectCodexOAuth(activeProviderId);
      setFlow(null);

      setLocallyDisconnected(true);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  }

  const connected =
    !locallyDisconnected &&
    (authStatus === "connected" || flow?.status === "connected");

  const rawError = error || (flow?.status === "error" ? flow.message || "Authorization failed." : "");
  const visibleError = rawError.toLowerCase().includes("invalid or expired token")
    ? t("chat.providersDialog.invalidOrExpiredToken")
    : rawError;
  return (
    <section className="space-y-3 rounded-[8px] border border-border/70 bg-background/45 p-4">
      <div>
        <p className="text-sm font-medium">{t("chat.providersDialog.chatgptSubscription")}</p>
        <p className="text-xs text-muted-foreground">
          {connected
            ? t("chat.providersDialog.chatgptConnected")
            : authStatus === "reauthorization_required"
              ? t("chat.providersDialog.chatgptReconnect")
              : t("chat.providersDialog.chatgptAuthorize")}
        </p>
      </div>
      {flow?.method === "device" && flow.status === "pending" ? (
        <div className="space-y-2 text-sm">
          <p>{t("chat.providersDialog.deviceCodeInstruction")}</p>
          <code className="block w-fit rounded bg-muted px-3 py-2 font-mono text-base">{flow.user_code}</code>
          <p className="text-xs text-muted-foreground">{t("chat.providersDialog.deviceCodeHelp")}</p>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(flow.user_code || "")}
          >
            {t("chat.providersDialog.copyCode")}
          </Button>

          <p className="text-xs text-muted-foreground">
            {t("chat.providersDialog.expiresAt", { time: new Date(flow.expires_at * 1000).toLocaleTimeString() })}
          </p>
        </div>
      ) : null}
      {flow?.method === "browser" && flow.status === "pending" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("chat.providersDialog.callbackHelp")}</p>
          <div className="flex gap-2">
            <Input value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} placeholder="http://localhost:1455/auth/callback?..." />
            <Button type="button" variant="outline" disabled={busy || !callbackUrl.trim()} onClick={() => void complete()}>{t("chat.providersDialog.complete")}</Button>
          </div>
        </div>
      ) : null}
      {flow?.status === "cancelled" ? (
        <p className="text-xs text-muted-foreground">Authorization cancelled.</p>
      ) : null}

      {visibleError ? <p role="alert" className="text-xs text-destructive">{visibleError}</p> : null}
      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <>
            <Button type="button" size="sm" disabled={busy} onClick={() => void start("browser")}>
              {authStatus === "reauthorization_required"
                ? t("chat.providersDialog.reconnectInBrowser")
                : t("chat.providersDialog.connectInBrowser")}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void start("device")}>{t("chat.providersDialog.useDeviceCode")}</Button>
            {flow?.status === "pending" ? (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void cancel()}>{t("chat.providersDialog.cancelAuthorization")}</Button>
            ) : null}
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void disconnect()}>Disconnect locally</Button>
        )}
      </div>
    </section>
  );
}
