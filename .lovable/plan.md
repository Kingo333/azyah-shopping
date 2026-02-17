

# Fix Capacitor Dependency Version Conflict

## Problem

The Codemagic build fails because five Capacitor plugin packages are at **v8** while `@capacitor/core` is at **v7.4.4**. The v8 plugins have a peer dependency requiring `@capacitor/core >= 8.0.0`, which conflicts.

**Conflicting packages (currently v8, need v7):**
- `@capacitor/app`: `^8.0.1` --> `^7.2.0`
- `@capacitor/browser`: `^8.0.1` --> `^7.2.0`
- `@capacitor/clipboard`: `^8.0.1` --> `^7.2.0`
- `@capacitor/share`: `^8.0.1` --> `^7.2.0`
- `@capacitor/status-bar`: `^8.0.1` --> `^7.2.0`

**Already correct (staying as-is):**
- `@capacitor/core`: `^7.4.4`
- `@capacitor/cli`: `^7.4.4`
- `@capacitor/ios`: `^7.4.4`

## Fix

Update `package.json` lines 15, 16, 18, 21, 22 to use `^7.2.0` (the latest v7 minor for these plugin packages). This aligns all Capacitor packages to major version 7, resolving the peer dependency conflict and allowing the Codemagic build to succeed.

