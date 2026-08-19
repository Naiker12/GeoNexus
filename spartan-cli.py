#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present Spartan Agents. All rights reserved.

"""
⚔️ Spartan Agents - CLI & Studio Launcher
"""

import sys

if __name__ == "__main__":
    sys.argv[0] = "spartan"
    from nexus_cli import app
    app()
