# Setup Guide - Drive License Application System

## Issues Found and Fixed

1. ✅ **Empty `.env` file** - Supabase credentials were missing
2. ✅ **Missing `nepali_name` field** - Added to database schema
3. ✅ **Incomplete trigger** - Updated to include `nepali_name` mapping

---

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account (free tier works)

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Setup Supabase Project

### Create a Supabase Project

1. Go to [Supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Save your Supabase credentials

### Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   You can find these in your Supabase Dashboard:
   - Settings → API → Project URL
   - Settings → API → Anon Key

### Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Create a new query
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the SQL Editor
5. Click **Run**

---

## Step 3: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Step 4: Test Signup & Login

### Create Admin User

1. Sign up with any email and password
2. Go to Supabase Dashboard → **SQL Editor**
3. Run this query to make that user an admin:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

### Test Flow

1. **Signup**: Go to `/signup` and create a new account
2. **Login**: Go to `/login` and log in
3. **Admin Dashboard**: If user is admin, redirects to `/admin/dashboard`
4. **User Dashboard**: If user is regular user, redirects to `/user/dashboard`

---

## Troubleshooting

### "Document already loaded" Console Error

This is from browser extensions (ad blockers, etc.) and doesn't affect the app. To suppress:
- Disable browser extensions
- Check browser console for actual errors (red messages)

### Signup/Login Still Not Working

1. **Check Environment Variables**
   ```bash
   echo $VITE_SUPABASE_URL  # Should show your Supabase URL
   echo $VITE_SUPABASE_ANON_KEY  # Should show your key
   ```

2. **Verify Supabase Connection**
   - Go to Supabase Dashboard
   - Check if tables were created: Auth → Browse all tables
   - Verify `profiles` table exists

3. **Check Browser Console**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for red error messages
   - Common issues:
     - "Invalid Supabase URL" → Wrong credentials
     - "Row not found" → Profile creation failed

4. **Database Trigger Issues**
   - Go to Supabase Dashboard → SQL Editor
   - Check if trigger exists:
     ```sql
     SELECT * FROM information_schema.triggers 
     WHERE trigger_name = 'on_auth_user_created';
     ```

---

## File Structure

```
src/
├── context/
│   ├── AuthContext.jsx       # Authentication logic
│   └── LanguageContext.jsx   # Language management
├── pages/
│   ├── Login.jsx             # Login page
│   ├── SignUp.jsx            # Signup page
│   ├── AdminDashboard.jsx    # Admin panel
│   └── UserDashboard.jsx     # User panel
├── lib/
│   └── supabase.js           # Supabase client config
└── components/
    ├── ProtectedRoute.jsx    # Auth guard
    └── ...                   # UI components
supabase/
└── schema.sql                # Database schema
```

---

## Database Schema Overview

### profiles table
Stores user profile information with fields:
- Personal info (first_name, middle_name, last_name, nepali_name)
- Demographics (gender, blood_group, date_of_birth)
- Contact (email, phone)
- Role (user or admin)

### Other tables
- `terms_acceptance` - Track user acceptance of terms
- `kyc` - Know Your Customer data
- `applications` - License applications
- `exams` - User exam records
- `licences` - Issued licenses
- `blog_posts` - System notices
- `questions` - Exam questions

---

## Notes

- Passwords are hashed by Supabase Auth
- RLS (Row Level Security) is enabled for data privacy
- Users can only see their own data
- Admins can view all profiles and manage content
- Age validation requires users to be 18+

---

## Support

For issues with Supabase, see [Supabase Docs](https://supabase.com/docs)
