# Authentication Testing Guide

Complete guide to test the authentication system implementation.

## ✅ Prerequisites

Before testing, ensure:
1. Supabase project is set up
2. Database migrations are run
3. `.env` file has correct credentials
4. Development server is running (`npm run dev`)

## 🧪 Test Checklist

### 1. Initial Setup Test

- [ ] Navigate to `http://localhost:3000`
- [ ] Verify you're redirected to `/login` (not authenticated)
- [ ] Check browser console for any errors

### 2. Sign Up Flow

#### Test Case 2.1: Successful Sign Up
- [ ] Click "Don't have an account? Sign up"
- [ ] Fill in:
  - Full Name: "Test User"
  - Email: "test@example.com"
  - Password: "password123"
- [ ] Click "Sign Up"
- [ ] Verify success message appears
- [ ] Auto-switches to sign in form after 2 seconds

#### Test Case 2.2: Duplicate Email
- [ ] Try signing up with same email again
- [ ] Verify error: "This email is already registered. Try signing in instead."

#### Test Case 2.3: Weak Password
- [ ] Try password less than 6 characters
- [ ] Verify HTML5 validation prevents submission

#### Test Case 2.4: Rate Limiting
- [ ] Attempt sign up 3-4 times rapidly
- [ ] Verify error: "Too many attempts. Please wait a minute and try again."
- [ ] Wait 60 seconds
- [ ] Verify you can try again

### 3. Sign In Flow

#### Test Case 3.1: Successful Sign In
- [ ] Enter email: "test@example.com"
- [ ] Enter password: "password123"
- [ ] Click "Sign In"
- [ ] Verify redirect to `/dashboard`
- [ ] Check user name appears in dashboard

#### Test Case 3.2: Wrong Password
- [ ] Enter correct email
- [ ] Enter wrong password
- [ ] Verify error: "Invalid email or password. Please check your credentials."

#### Test Case 3.3: Non-existent Email
- [ ] Enter email that doesn't exist
- [ ] Verify error message appears

### 4. Protected Routes Test

#### Test Case 4.1: Access Without Auth
- [ ] Sign out if signed in
- [ ] Try navigating to `/dashboard` directly
- [ ] Verify redirect to `/login`

#### Test Case 4.2: Access With Auth
- [ ] Sign in
- [ ] Navigate to `/dashboard`
- [ ] Verify page loads successfully
- [ ] Navigate to `/practice`
- [ ] Verify page loads successfully

### 5. Session Persistence Test

#### Test Case 5.1: Page Refresh
- [ ] Sign in
- [ ] Refresh the page (F5)
- [ ] Verify you remain signed in
- [ ] Verify no redirect to login

#### Test Case 5.2: New Tab
- [ ] While signed in, open new tab
- [ ] Navigate to `http://localhost:3000`
- [ ] Verify you're already signed in
- [ ] Verify no login required

#### Test Case 5.3: Browser Restart
- [ ] Sign in
- [ ] Close all browser windows
- [ ] Reopen browser
- [ ] Navigate to app
- [ ] Verify you're still signed in (session persisted)

### 6. Sign Out Flow

#### Test Case 6.1: Normal Sign Out
- [ ] Click "Sign Out" button
- [ ] Verify redirect to `/login`
- [ ] Try accessing `/dashboard`
- [ ] Verify redirect back to `/login`

#### Test Case 6.2: Sign Out Across Tabs
- [ ] Sign in
- [ ] Open app in two tabs
- [ ] Sign out in one tab
- [ ] Switch to other tab
- [ ] Refresh or navigate
- [ ] Verify also signed out

### 7. Database Integration Test

#### Test Case 7.1: Profile Creation
- [ ] Sign up new user
- [ ] Open Supabase dashboard
- [ ] Navigate to Table Editor → `profiles`
- [ ] Verify new profile row exists
- [ ] Check `full_name` matches what you entered

#### Test Case 7.2: RLS Policies
- [ ] Sign in as User A
- [ ] Note your user ID (check browser console or Supabase)
- [ ] Try to access profiles table directly via Supabase client
- [ ] Verify you can only see your own profile

### 8. Error Handling Test

#### Test Case 8.1: Network Error
- [ ] Turn off WiFi/Network
- [ ] Try to sign in
- [ ] Verify appropriate error message
- [ ] Turn network back on
- [ ] Verify retry works

#### Test Case 8.2: Invalid Credentials
- [ ] Try various invalid inputs:
  - Empty email
  - Invalid email format
  - Empty password
  - Very long password (> 72 chars)
- [ ] Verify appropriate error messages

### 9. TypeScript Type Safety Test

#### Test Case 9.1: Compile Time Checks
```bash
npm run type-check
```
- [ ] Verify no TypeScript errors
- [ ] Check that database types are correctly inferred

#### Test Case 9.2: IDE Autocomplete
- [ ] Open any file that uses Supabase
- [ ] Type `supabase.from('`
- [ ] Verify table names autocomplete
- [ ] Select a table
- [ ] Verify column names autocomplete

### 10. Performance Test

#### Test Case 10.1: Load Time
- [ ] Sign in
- [ ] Measure time from click to dashboard load
- [ ] Should be < 2 seconds on good connection

#### Test Case 10.2: Auth State Check
- [ ] Clear cache
- [ ] Navigate to app
- [ ] Measure time for auth check
- [ ] Should be < 500ms

## 🐛 Common Issues & Solutions

### Issue 1: "Missing Supabase environment variables"
**Solution:**
- Check `.env` file exists
- Verify variables start with `VITE_`
- Restart dev server

### Issue 2: "Too Many Requests (429)"
**Solution:**
- Wait 60 seconds
- Check if you're in a loop
- Verify rate limiting is working correctly

### Issue 3: Profile Not Created
**Solution:**
- Check Supabase logs
- Verify trigger exists: `on_auth_user_created`
- Manually check `auth.users` table

### Issue 4: Can't Sign In After Sign Up
**Solution:**
- Check email confirmation settings
- In Supabase: Authentication → Settings → Email Confirmations
- For testing, disable "Confirm email"

### Issue 5: Session Not Persisting
**Solution:**
- Check browser localStorage
- Look for `sb-{project-ref}-auth-token`
- Verify `persistSession: true` in Supabase client

## 📊 Expected Behavior Summary

| Action | Expected Behavior |
|--------|-------------------|
| Access `/` while logged out | Redirect to `/login` |
| Access `/` while logged in | Redirect to `/dashboard` |
| Access `/login` while logged in | Redirect to `/dashboard` |
| Access `/dashboard` while logged out | Redirect to `/login` |
| Sign up with new email | Success → Switch to sign in |
| Sign up with existing email | Error message |
| Sign in with correct credentials | Redirect to `/dashboard` |
| Sign in with wrong credentials | Error message |
| Sign out | Redirect to `/login` + clear session |
| Refresh page while logged in | Stay logged in |
| Open new tab while logged in | Already authenticated |

## ✅ Test Completion

Once all tests pass:
- [ ] All 10 test sections completed
- [ ] No console errors
- [ ] Type checking passes
- [ ] Authentication is production-ready

## 🔐 Security Checklist

Before deploying:
- [ ] RLS policies enabled on all user tables
- [ ] Email confirmation enabled (if required)
- [ ] Strong password requirements enforced
- [ ] Rate limiting tested
- [ ] No API keys in client code
- [ ] HTTPS enforced in production
- [ ] Auth tokens stored securely
- [ ] Session timeout configured

---

**Last Updated:** 2025-11-15
**Status:** Ready for Testing
