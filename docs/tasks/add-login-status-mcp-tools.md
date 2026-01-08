# Task: Add Login and Status MCP Tools

## Problem

When a user adds this MCP to their Claude config but hasn't logged in or installed the browser, the AI has no way to:
1. Know that authentication is required
2. Help the user log in
3. Check the current status of the system

## Solution

Add two new MCP tools and improve error messaging:

1. **`check_status` tool** - Returns authentication state, catalog status, and cache info
2. **`login` tool** - Launches browser for user to authenticate
3. **Improved tool descriptions** - Add notes about authentication requirements to existing tools

## Implementation Plan

### 1. Add `check_status` Tool

**Location**: `src/server.ts`

```typescript
{
  name: "check_status",
  description: "Check the authentication and system status...",
  inputSchema: z.object({}),
  execute: async () => {
    // Return auth state, catalog status, cache stats
  }
}
```

**Returns**:
```json
{
  "authentication": {
    "status": "not_logged_in" | "authenticated" | "expired",
    "lastLoginAt": "2025-01-08T10:00:00Z",
    "action": "Run the login tool to authenticate"
  },
  "catalog": {
    "status": "synced" | "not_synced",
    "totalBlocks": 95,
    "totalVariants": 632,
    "lastSyncedAt": "2025-01-08T10:00:00Z"
  },
  "cache": {
    "totalCachedVariants": 45,
    "sizeBytes": 1234567
  }
}
```

### 2. Add `login` Tool

**Location**: `src/server.ts`

```typescript
{
  name: "login",
  description: "Launch browser for Tailwind Plus authentication...",
  inputSchema: z.object({}),
  execute: async () => {
    // Check if already authenticated
    // Launch browser with login()
    // Return result
  }
}
```

**Behavior**:
- First checks if already authenticated (skip if valid)
- Launches visible browser window
- Navigates to Tailwind Plus login page
- Waits for user to complete login (5 min timeout)
- Saves cookies and returns success/failure

**Returns**:
```json
{
  "success": true,
  "message": "Successfully logged in to Tailwind Plus",
  "nextSteps": ["Use get_variant to fetch component code"]
}
```

### 3. Update Tool Descriptions

Add authentication notes to tool descriptions:

**`get_variant`**:
```
AUTHENTICATION: Requires valid Tailwind Plus subscription.
Run: bun run src/index.ts login
```

Should become:
```
AUTHENTICATION: Requires valid Tailwind Plus subscription.
If not authenticated, use the 'login' tool or run CLI: bun run src/index.ts login
```

### 4. Improve Auth Error Messages

When `get_variant` returns `AUTH_REQUIRED`, include helpful guidance:

```json
{
  "error": "AUTH_REQUIRED",
  "message": "Authentication required to fetch component code",
  "action": "Use the 'login' tool to authenticate, or run: bun run src/index.ts login"
}
```

## Files to Modify

1. `src/server.ts` - Add two new tools, update descriptions
2. `src/browser/browser.ts` - Ensure login() can be called from MCP context

## Considerations

### Browser Launch in MCP Context

The `login()` function launches a visible browser (`headless: false`). This works well in:
- **Stdio mode**: User is at terminal, can see browser window
- **HTTP mode**: User needs to be at the machine to interact

For remote scenarios, we should return a clear message that physical access is needed.

### Rate Limiting Login Attempts

Add basic protection against repeated login calls - check auth state first and return early if already authenticated.

## Tasks

- [x] Add `check_status` tool to server.ts
- [x] Add `login` tool to server.ts
- [x] Update `get_variant` description with auth guidance
- [x] Update AUTH_REQUIRED error response with action guidance
- [x] Build passes
- [ ] Update README with new tool documentation

## Implementation Summary

### Changes Made

**`src/server.ts`:**

1. **Import `login` function** from browser.ts (line 7)

2. **Updated `get_variant` tool description** (lines 210-213):
   - Changed auth guidance from CLI command to: "use the 'login' tool to open a browser for authentication"

3. **Updated AUTH_REQUIRED error response** (lines 243-248):
   - Added `action` field with login tool guidance
   - Changed message to be more descriptive

4. **Added `check_status` tool** (lines 481-537):
   - Returns authentication status (`authenticated`, `expired`, `not_logged_in`)
   - Returns catalog sync status and stats
   - Returns cache statistics
   - Provides actionable guidance when not authenticated or catalog not synced

5. **Added `login` tool** (lines 539-645):
   - Checks if already authenticated (returns early if so)
   - Launches visible browser for user authentication
   - 5 minute timeout for login completion
   - Returns success with next steps on successful login
   - Returns error with helpful hints on failure

6. **Updated root endpoint tools list** (lines 688-697):
   - Added `check_status` and `login` to the tools array
