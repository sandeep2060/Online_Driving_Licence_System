# Troubleshooting Console Errors

## Issue: Console Shows Extension Initialization Messages

### Error Messages:
```
Document already loaded, running initialization immediately
content-script.js:4 Attempting to initialize AdUnit
content-script.js:6 AdUnit initialized successfully
chext_driver.js:539 Initialized driver at: ...
chext_loader.js:73 Initialized chextloader at: ...
```

### Cause:
These errors are coming from **browser extensions**, not your application. Common culprits:
- Ad blockers (uBlock Origin, AdBlock, etc.)
- Chrome extensions that inject scripts
- Extension development tools running

### Solution:

#### Option 1: Disable Extensions (Temporary)
1. Open Chrome DevTools
2. Go to `chrome://extensions`
3. Disable all extensions temporarily
4. Refresh the page
5. Check if signup/login works

#### Option 2: Create Chrome Profile
1. Create a new Chrome profile without extensions:
   - Chrome Menu → Settings → Create new profile
   - Open localhost:5173 in this new profile
   - Extensions won't load in new profiles
2. Test signup/login

#### Option 3: Use Incognito Mode
1. Open DevTools (F12)
2. Settings (⋮ → Settings)
3. Check "Disable extensions"
4. Or: Open in Incognito window (Ctrl+Shift+N) where extensions are disabled

#### Option 4: Allowlist Your Local Dev Server
If you want to keep extensions enabled:
1. Open each extension's options/settings
2. Allowlist `localhost:5173`
3. Some extensions (like ad blockers) have whitelist options

---

## Actual App Errors vs Extension Errors

### How to Tell the Difference:

**Extension errors:**
- Come from files like: `content-script.js`, `chext_*.js`, `ad*.js`
- Don't affect app functionality
- Are safe to ignore

**App errors (red text in console):**
- Come from `main.jsx`, `src/...`, `vite/...`
- Show actual issues in your app
- Need to be fixed

### Example:

```javascript
// ❌ This is a REAL error (red):
Uncaught Error: Invalid Supabase URL

// ✅ This can be ignored (just warning):
content-script.js:4 Attempting to initialize AdUnit
```

---

## Login/Signup Issues: Real Causes

If signup/login doesn't work, check for these **actual errors** (red in console):

### 1. Supabase Not Connected
```
Error: Invalid Supabase URL or Anonymous Key
```
**Fix**: Add credentials to `.env` file (see SETUP.md)

### 2. Network Error
```
Failed to fetch | Cross-origin request blocked
```
**Fix**: Verify Supabase URL is correct in .env

### 3. Database Trigger Failed
```
Error: User created but profile not found
```
**Fix**: Re-run the SQL schema in Supabase Dashboard

### 4. Invalid Email/Password
```
Invalid email or password
```
**Fix**: Check credentials in form, verify no spaces in password

---

## Debugging Steps

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Look for RED errors** (not warnings/info)
4. **Search for errors from your app:**
   - Filter for: `main.jsx`, `AuthContext`, `Login`, `SignUp`
   - Ignore: `content-script`, `ad`, `chext_`, `chrome-extension://`
5. **Copy the red error message and search it online**

---

## Still Having Issues?

Check [SETUP.md](SETUP.md) for:
- Environment variable setup
- Database schema verification
- Supabase trigger configuration
