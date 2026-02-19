-- =============================================
-- DriveLicense - Supabase SQL Schema (Free Plan)
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension (built-in on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS / AUTH (uses Supabase Auth - no extra tables)
-- =============================================

-- Profiles table - extends auth.users with app-specific data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-create profile on signup (via trigger)
-- Pass metadata in signUp: { data: { first_name, last_name, ... } }
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, middle_name, last_name, date_of_birth, gender, blood_group, phone)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'middle_name',
    NEW.raw_user_meta_data->>'last_name',
    (NEW.raw_user_meta_data->>'date_of_birth')::DATE,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'blood_group',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: run after new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- To make a user admin: run in SQL Editor after they sign up
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- =============================================
-- TERMS ACCEPTANCE (for exam & system terms)
-- =============================================
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  terms_type TEXT NOT NULL CHECK (terms_type IN ('exam', 'system')),
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, terms_type)
);

ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own terms"
  ON public.terms_acceptance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own terms"
  ON public.terms_acceptance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- APPLICATIONS (licence applications)
-- =============================================
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new', 'renew', 'replace')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update applications"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Generate reference number
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TEXT AS $$
  SELECT 'DL-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
$$ LANGUAGE SQL;

-- =============================================
-- UPDATED_AT trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- KYC (Know Your Customer)
-- =============================================
CREATE TABLE IF NOT EXISTS public.kyc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','verified','rejected')),
  personal JSONB,    -- name, dob, gender, blood group, phone, email
  address JSONB,     -- province, district, municipality, ward, street
  documents JSONB,   -- citizenship, licence, etc.
  vehicle_types TEXT[], -- Nepal licence categories (A, B, C, K, etc.)
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.kyc ENABLE ROW LEVEL SECURITY;

-- Users: view and upsert own KYC
CREATE POLICY "Users can view own KYC"
  ON public.kyc FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC"
  ON public.kyc FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KYC when not verified"
  ON public.kyc FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending','rejected'))
  WITH CHECK (auth.uid() = user_id);

-- Admins: view all, review KYC
CREATE POLICY "Admins can view all KYC"
  ON public.kyc FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can review KYC"
  ON public.kyc FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- EXAMS
-- =============================================
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_started','in_progress','passed','failed')),
  score INT,
  categories TEXT[], -- vehicle categories for this exam
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exams"
  ON public.exams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exams"
  ON public.exams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all exams"
  ON public.exams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- LICENCES
-- =============================================
CREATE TABLE IF NOT EXISTS public.licences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_number TEXT UNIQUE,
  categories TEXT[],
  issued_at DATE,
  expires_at DATE
);

ALTER TABLE public.licences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own licences"
  ON public.licences FOR SELECT
  USING (auth.uid() = user_id);

-- Typically only admins/authority issue or modify licences
CREATE POLICY "Admins can manage licences"
  ON public.licences FOR INSERT, UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- BLOG POSTS (Notices)
-- =============================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read notices/blog posts
CREATE POLICY "Anyone can read blog posts"
  ON public.blog_posts FOR SELECT
  USING (TRUE);

-- Only admins can create/update/delete posts
CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts FOR INSERT, UPDATE, DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- QUESTIONS (Exam question bank)
-- =============================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  language TEXT NOT NULL CHECK (language IN ('en','ne','image')),
  question_text TEXT,
  question_image_url TEXT,
  options JSONB NOT NULL, -- array of 4 options [{ text?, image_url? }, ...]
  correct_index INT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Everyone can read questions (for practice / exam)
CREATE POLICY "Anyone can read questions"
  ON public.questions FOR SELECT
  USING (TRUE);

-- Only admins can manage questions
CREATE POLICY "Admins can manage questions"
  ON public.questions FOR INSERT, UPDATE, DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

