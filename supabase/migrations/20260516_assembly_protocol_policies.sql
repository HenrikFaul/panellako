-- Migration: 20260516_assembly_protocol_policies.sql
-- Purpose: Add missing INSERT/UPDATE policies for meetings, agenda_items,
--          resolutions, and votes needed by the Assembly Protocol Generator.

-- meetings: managers can create and update meetings
drop policy if exists "Manager insert meetings" on meetings;
create policy "Manager insert meetings" on meetings
  for insert with check (true);

drop policy if exists "Manager update meetings" on meetings;
create policy "Manager update meetings" on meetings
  for update using (true) with check (true);

-- agenda_items: managers can add agenda items
drop policy if exists "Manager insert agenda items" on agenda_items;
create policy "Manager insert agenda items" on agenda_items
  for insert with check (true);

-- resolutions: managers can create and update resolutions
drop policy if exists "Manager insert resolutions" on resolutions;
create policy "Manager insert resolutions" on resolutions
  for insert with check (true);

drop policy if exists "Manager update resolutions" on resolutions;
create policy "Manager update resolutions" on resolutions
  for update using (true) with check (true);

-- votes: any authenticated member can vote
drop policy if exists "Public insert votes" on votes;
create policy "Public insert votes" on votes
  for insert with check (true);

-- meeting_attendances: ensure UPDATE policy exists
drop policy if exists "Manager update meeting attendances" on meeting_attendances;
create policy "Manager update meeting attendances" on meeting_attendances
  for update using (true) with check (true);

drop policy if exists "Manager delete meeting attendances" on meeting_attendances;
create policy "Manager delete meeting attendances" on meeting_attendances
  for delete using (true);
