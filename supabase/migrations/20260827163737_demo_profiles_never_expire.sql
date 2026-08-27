-- Public demo accounts must remain available for product presentations.
-- Pair each fixed UUID with its fixed public demo e-mail to keep the update narrow.
UPDATE public.profiles
SET free_trial_never_expires = true
WHERE
  (id = 'aaaaaaaa-0001-0001-0001-000000000001'::uuid AND email = 'demo.kepviselo@panellako.hu')
  OR (id = 'aaaaaaaa-0002-0002-0002-000000000002'::uuid AND email = 'demo.lako@panellako.hu')
  OR (id = 'aaaaaaaa-0003-0003-0003-000000000003'::uuid AND email = 'demo.konyvelo@panellako.hu');
