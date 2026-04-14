-- 1. Update Students table to be user-specific
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade TEXT,
    attendance TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own students" ON public.students;
CREATE POLICY "Users can manage their own students" ON public.students
    FOR ALL USING (auth.uid() = user_id);

-- 2. Create User Profiles/Stats table for persistence
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stats JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own stats" ON public.user_stats;
CREATE POLICY "Users can manage their own stats" ON public.user_stats
    FOR ALL USING (auth.uid() = user_id);

-- 3. Ensure user_logins is also secure
ALTER TABLE public.user_logins ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_logins;
CREATE POLICY "Enable insert for authenticated users" ON public.user_logins
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
