-- =============================================
-- DriveLicense - Complete Supabase SQL Schema
-- Optimized for Free Plan - Run in Supabase SQL Editor
-- =============================================

-- Enable UUID extension (built-in on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if re-running)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
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
    CASE 
      WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'date_of_birth')::DATE 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'blood_group',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TERMS ACCEPTANCE
-- =============================================
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  terms_type TEXT NOT NULL CHECK (terms_type IN ('exam', 'system')),
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, terms_type)
);

CREATE INDEX IF NOT EXISTS idx_terms_user_id ON public.terms_acceptance(user_id);

ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own terms" ON public.terms_acceptance;
DROP POLICY IF EXISTS "Users can insert own terms" ON public.terms_acceptance;

CREATE POLICY "Users can view own terms"
  ON public.terms_acceptance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own terms"
  ON public.terms_acceptance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- APPLICATIONS
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

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_ref_number ON public.applications(reference_number);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.applications;

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

-- =============================================
-- KYC TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.kyc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','verified','rejected')),
  personal JSONB,
  address JSONB,
  documents JSONB,
  vehicle_types TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON public.kyc(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_user_unique ON public.kyc(user_id) WHERE status IN ('submitted', 'verified');

ALTER TABLE public.kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own KYC" ON public.kyc;
DROP POLICY IF EXISTS "Users can insert own KYC" ON public.kyc;
DROP POLICY IF EXISTS "Users can update own KYC when not verified" ON public.kyc;
DROP POLICY IF EXISTS "Admins can view all KYC" ON public.kyc;
DROP POLICY IF EXISTS "Admins can review KYC" ON public.kyc;

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
-- EXAMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_started','in_progress','passed','failed')),
  score INT CHECK (score >= 0 AND score <= 100),
  categories TEXT[],
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_attempted_at ON public.exams(attempted_at DESC);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exams" ON public.exams;
DROP POLICY IF EXISTS "Users can insert own exams" ON public.exams;
DROP POLICY IF EXISTS "Users can update own exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can view all exams" ON public.exams;

CREATE POLICY "Users can view own exams"
  ON public.exams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exams"
  ON public.exams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exams"
  ON public.exams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all exams"
  ON public.exams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- LICENCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.licences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_number TEXT UNIQUE,
  categories TEXT[],
  issued_at DATE,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licences_user_id ON public.licences(user_id);
CREATE INDEX IF NOT EXISTS idx_licences_card_number ON public.licences(card_number);
CREATE INDEX IF NOT EXISTS idx_licences_expires_at ON public.licences(expires_at);

ALTER TABLE public.licences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own licences" ON public.licences;
DROP POLICY IF EXISTS "Admins can insert licences" ON public.licences;
DROP POLICY IF EXISTS "Admins can update licences" ON public.licences;

CREATE POLICY "Users can view own licences"
  ON public.licences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert licences"
  ON public.licences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update licences"
  ON public.licences FOR UPDATE
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
-- BLOG POSTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts(created_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can insert blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can update blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can delete blog posts" ON public.blog_posts;

CREATE POLICY "Anyone can read blog posts"
  ON public.blog_posts FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can insert blog posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE
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

CREATE POLICY "Admins can delete blog posts"
  ON public.blog_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- QUESTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  language TEXT NOT NULL CHECK (language IN ('en','ne','image')),
  question_text TEXT,
  question_image_url TEXT,
  options JSONB NOT NULL CHECK (jsonb_array_length(options) = 4),
  correct_index INT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_language ON public.questions(language);
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;

CREATE POLICY "Anyone can read questions"
  ON public.questions FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE
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

CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
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
  FOR EACH ROW 
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW 
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW 
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- HELPER FUNCTION: Generate reference number
-- =============================================
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TEXT AS $$
  SELECT 'DL-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
$$ LANGUAGE SQL IMMUTABLE;

-- =============================================
-- HELPER FUNCTION: Check if user can retake exam (90 days rule)
-- =============================================
CREATE OR REPLACE FUNCTION can_retake_exam(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_failed_date TIMESTAMPTZ;
  days_passed INT;
BEGIN
  SELECT attempted_at INTO last_failed_date
  FROM public.exams
  WHERE user_id = p_user_id 
    AND status = 'failed'
  ORDER BY attempted_at DESC
  LIMIT 1;
  
  IF last_failed_date IS NULL THEN
    RETURN TRUE;
  END IF;
  
  days_passed := EXTRACT(EPOCH FROM (NOW() - last_failed_date)) / 86400;
  RETURN days_passed >= 90;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Days remaining until retake
-- =============================================
CREATE OR REPLACE FUNCTION days_until_retake(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  last_failed_date TIMESTAMPTZ;
  days_passed INT;
BEGIN
  SELECT attempted_at INTO last_failed_date
  FROM public.exams
  WHERE user_id = p_user_id 
    AND status = 'failed'
  ORDER BY attempted_at DESC
  LIMIT 1;
  
  IF last_failed_date IS NULL THEN
    RETURN 0;
  END IF;
  
  days_passed := EXTRACT(EPOCH FROM (NOW() - last_failed_date)) / 86400;
  RETURN GREATEST(0, 90 - days_passed::INT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- NOTES
-- =============================================
-- To make a user admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';
--
-- To view all tables:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
--
-- To check RLS policies:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
