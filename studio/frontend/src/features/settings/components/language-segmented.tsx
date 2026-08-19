// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Nexus AI team. All rights reserved.

import { cn } from "@/lib/utils";
import {
  AUTO_LOCALE,
  setLocale,
  useLocalePreference,
  usePendingLocalePreference,
  useT,
} from "@/i18n";
import { motion, useReducedMotion } from "motion/react";
import { LanguageSelect } from "./language-select";

export function LanguageControls() {
  const t = useT();
  const preference = useLocalePreference();
  const pendingPreference = usePendingLocalePreference();
  const reduced = useReducedMotion();

  const currentActive = pendingPreference ?? preference;

  const quickOptions = [
    { value: "es", label: "Español" },
    { value: "en", label: "English" },
    { value: AUTO_LOCALE, label: t("settings.appearance.language.autoDetect") },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="hub-tab-toggle inline-flex h-8 items-center rounded-full">
        {quickOptions.map((opt) => {
          const active = currentActive === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLocale(opt.value)}
              aria-pressed={active}
              className={cn(
                "relative flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors cursor-pointer",
                active
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="language-pill"
                  className="hub-tab-toggle-pill absolute inset-0 rounded-full"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 500, damping: 35, mass: 0.5 }
                  }
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
      <LanguageSelect />
    </div>
  );
}
