# Supabase setup reference

> Chỉ dùng tài liệu này nếu dự án Supabase hiện tại chưa có bảng/RPC tương ứng. Nếu bảng và RPC đã hoạt động, không cần chạy lại.

## Table shape

`public.hs_discover_submissions` cần có:

- `id uuid primary key default gen_random_uuid()`
- `participant_code text not null`
- `condition text not null check (condition in ('A','B','C','D'))`
- `pre_discover jsonb not null default '{}'::jsonb`
- `discover_data jsonb not null default '{}'::jsonb`
- `post_discover jsonb not null default '{}'::jsonb`
- `consent_to_submit boolean not null check (consent_to_submit = true)`
- `created_at timestamptz not null default now()`

## Participant-code RPC

```sql
create sequence if not exists public.hs_participant_code_seq start 1;

create or replace function public.next_hs_participant_code()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select nextval('public.hs_participant_code_seq')::text;
$$;

revoke all on function public.next_hs_participant_code() from public;
grant execute on function public.next_hs_participant_code() to anon, authenticated;
notify pgrst, 'reload schema';
```

## RLS principles

- Enable RLS on `public.hs_discover_submissions`.
- Revoke broad table privileges from `anon` and `authenticated`, then grant only `INSERT` if anonymous submissions are required.
- Create an INSERT policy for `anon, authenticated` with `WITH CHECK (consent_to_submit = true)`.
- Do not create a public SELECT policy for research submissions.
- Never put a `service_role` key in `supabase-config.js` or any frontend file.

Run SQL only after checking the current table, sequence, grants and policies to avoid duplicating or weakening an existing secure setup.
