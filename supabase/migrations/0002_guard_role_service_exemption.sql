-- Corrige `guard_profile_role` : le trigger bloquait aussi les outils d'administration.
--
-- Problème : le trigger se déclenche quelle que soit la clé utilisée. Avec la clé secrète
-- (rôle Postgres `service_role`), `auth.uid()` est NULL, donc `is_admin()` est faux et
-- toute promotion échouait — y compris la création du tout premier COACH, qui n'a aucun
-- autre chemin possible.
--
-- Deux changements :
--
-- 1. La fonction passe en SECURITY INVOKER. En SECURITY DEFINER, `current_user` désigne le
--    propriétaire de la fonction et non l'appelant : impossible d'y reconnaître
--    `service_role`. Le trigger n'a besoin d'aucun privilège élevé, seul `is_admin()` en
--    requiert, et cette fonction-là reste SECURITY DEFINER.
--
-- 2. `service_role` est explicitement exempté. Ce n'est pas un affaiblissement : cette clé
--    contourne déjà la RLS et peut tout faire. Le trigger ne la freinait pas réellement,
--    il ne faisait que casser l'outillage légitime. La vraie protection est que la clé
--    secrète ne quitte jamais le serveur.

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user <> 'service_role'
     and not public.is_admin() then
    raise exception 'Seul un administrateur peut modifier un rôle.'
      using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
