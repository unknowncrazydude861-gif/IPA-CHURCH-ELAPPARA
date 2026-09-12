-- IPA Church Elappara — media sections migration
-- Run this once in Supabase SQL Editor after the original site_media setup.

alter table public.site_media
  add column if not exists section text not null default 'gallery';

-- Normalize any existing media imported before sectioned media was added.
update public.site_media
set section = 'gallery'
where section is null or trim(section) = '';

create index if not exists site_media_section_sort_idx
  on public.site_media(section, sort_order, created_at);

-- Allowed values for the Admin Panel sections.
alter table public.site_media
  drop constraint if exists site_media_section_check;

alter table public.site_media
  add constraint site_media_section_check
  check (section in ('home','youth','worship','family','gallery','sunday'));
