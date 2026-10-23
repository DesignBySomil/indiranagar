#!/bin/bash
# Always run capture/drive scripts through this: SIGTERM at 105s so puppeteer closes Chrome
# BEFORE the tool harness hard-kills the shell (orphaned Chrome instances starve the box).
timeout -s TERM 116 node "$@"
