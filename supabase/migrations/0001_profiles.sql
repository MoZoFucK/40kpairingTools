-- Rôles applicatifs et profils utilisateurs.
--
-- Cahier des charges §9 : les rôles sont stockés en base et contrôlés côté serveur.
-- Un rôle transmis par le navigateur n'est jamais considéré comme fiable.

create type public.user_role as enum ('PLAYER', 'COACH', 'ADMIN');

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'PLAYER',
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Rôle applicatif de chaque utilisateur. Seule source de vérité pour les autorisations.';

-- Tout compte créé via Supabase Auth reçoit un profil PLAYER.
-- La promotion en COACH ou ADMIN est un acte délibéré, jamais un effet de bord de
-- l''inscription.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lecture du rôle courant sans déclencher la RLS de `profiles`.
-- Sans ce contournement, une policy sur `profiles` qui interroge `profiles` provoquerait
-- une récursion infinie.
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'ADMIN', false);
$$;

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select
  using (user_id = auth.uid());

create policy profiles_select_admin
  on public.profiles for select
  using (public.is_admin());

-- Un utilisateur peut modifier son nom affiché, jamais son rôle.
-- La colonne `role` est protégée par un trigger : une policy UPDATE ne peut pas
-- restreindre les colonnes modifiables.
create policy profiles_update_own
  on public.profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_update_admin
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Seul un administrateur peut modifier un rôle.'
      using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Aucune policy INSERT ni DELETE : les profils naissent et meurent avec le compte
-- Supabase Auth, via le trigger et la cascade.
