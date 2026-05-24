-- Add phone field to resident profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
