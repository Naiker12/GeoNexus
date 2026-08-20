# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present Spartan Agent. All rights reserved.

import sys

if __name__ == "__main__":
    sys.argv[0] = "spartan"

from spartan_agent_cli import app

if __name__ == "__main__":
    app()
