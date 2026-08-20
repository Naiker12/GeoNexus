// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import {
  ArrowExpand01Icon,
  Edit03Icon,
  ImageUpload01Icon,
  MagicWand01Icon,
  PaintBrush02Icon,
  SparklesIcon,
  ZoomInAreaIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { TranslationKey } from "@/i18n";

export type WorkflowId =
  | "create"
  | "transform"
  | "inpaint"
  | "extend"
  | "upscale"
  | "reference"
  | "edit";

/** The Images workflows, shared by the page and the sidebar submenu. `requires` is the backend
 *  workflow id (status.workflows) the loaded model must support; null = always available. */
export const WORKFLOW_TABS: Array<{
  id: WorkflowId;
  labelKey: TranslationKey;
  /** Page heading, when the sidebar's short label would read oddly on its own.
   *  Falls back to `labelKey`. */
  headingKey?: TranslationKey;
  requires: string | null;
  icon: IconSvgElement;
  hintKey: TranslationKey;
}> = [
  {
    id: "create",
    labelKey: "images.workflows.create.label",
    // The sidebar nests this under Images, so "Create" alone is clear there.
    headingKey: "images.workflows.create.heading",
    requires: null,
    // Not the pencil: that is the sidebar's New chat icon.
    icon: SparklesIcon,
    hintKey: "images.workflows.create.hint",
  },
  {
    id: "transform",
    labelKey: "images.workflows.transform.label",
    icon: MagicWand01Icon,
    requires: "img2img",
    hintKey: "images.workflows.transform.hint",
  },
  {
    id: "inpaint",
    labelKey: "images.workflows.inpaint.label",
    icon: PaintBrush02Icon,
    requires: "inpaint",
    hintKey: "images.workflows.inpaint.hint",
  },
  {
    id: "extend",
    labelKey: "images.workflows.extend.label",
    icon: ArrowExpand01Icon,
    requires: "outpaint",
    hintKey: "images.workflows.extend.hint",
  },
  {
    id: "upscale",
    labelKey: "images.workflows.upscale.label",
    icon: ZoomInAreaIcon,
    requires: "upscale",
    hintKey: "images.workflows.upscale.hint",
  },
  {
    id: "reference",
    labelKey: "images.workflows.reference.label",
    icon: ImageUpload01Icon,
    requires: "reference",
    hintKey: "images.workflows.reference.hint",
  },
  {
    id: "edit",
    labelKey: "images.workflows.edit.label",
    icon: Edit03Icon,
    requires: "edit",
    hintKey: "images.workflows.edit.hint",
  },
];
