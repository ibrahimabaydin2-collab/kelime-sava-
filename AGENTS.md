# Project Rules and Guidelines

## Server & Connection Protection Rules
To ensure the multiplayer functionality and internet settings are never broken, subsequent developers and agents must adhere to these rules:

1. **Keep the Live Render Server URLs**: 
   - `DEPLOYED_APP_URL` and `DEV_APP_URL` inside `src/utils/api.ts` must always point to the production server: `https://kelime-sava.onrender.com`.
   - Never replace these with standard run.app URLs or other development URLs unless explicitly requested by the user.

2. **Allow onrender.com Cookies & Fetch Interception**:
   - The fetch interceptor inside `src/utils/api.ts` must allow matching `onrender.com` URLs to ensure token synchronization and session storage persist across native and web environments:
     ```typescript
     if (url && (url.includes('run.app') || url.includes('onrender.com') || url.startsWith('/api/'))) {
       // Must set the custom authorization headers and cookies
     }
     ```

3. **Gemini API Live Proxy**:
   - In `server.ts`, the chat/Gemini API calls should proxy requests directly to the Render server: `https://kelime-sava.onrender.com/api/chat`.
