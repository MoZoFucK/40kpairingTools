-- Vérification des listes adverses.
--
-- Une liste adverse est saisie par le coach, souvent vite et à partir d'une source
-- approximative. Avant d'estimer, l'équipe veut savoir si quelqu'un l'a relue contre la
-- liste officielle — et qui, pour pouvoir lui poser la question.
--
-- N'importe quel joueur de notre équipe, le coach ou l'admin peut poser ou retirer le
-- drapeau. Un joueur n'a aucun autre droit d'écriture sur une fiche adverse : il passe
-- donc par une fonction dédiée plutôt que par une policy UPDATE, qui ne saurait pas
-- restreindre les colonnes modifiables.

alter table public.players
  add column list_verified_at      timestamptz,
  add column list_verified_by      uuid references auth.users (id) on delete set null,
  -- Nom figé au moment de la vérification : les joueurs ne lisent pas `profiles`, et le
  -- nom doit rester affiché même si le compte disparaît.
  add column list_verified_by_name text,
  add constraint players_list_verification_consistent check (
    (list_verified_at is null and list_verified_by_name is null)
    or (list_verified_at is not null and list_verified_by_name is not null)
  );

comment on column public.players.list_verified_at is
  'Date à laquelle la liste adverse a été vérifiée. Nulle tant qu''elle ne l''est pas.';
comment on column public.players.list_verified_by_name is
  'Nom de la personne qui a vérifié la liste, figé au moment de la vérification.';

/*
 * Pose ou retire le drapeau de vérification d'une liste adverse.
 *
 * SECURITY DEFINER : l'appelant joueur n'a pas le droit d'écrire dans `players` pour une
 * fiche adverse. Les contrôles sont donc faits ici, explicitement :
 *   - la fiche appartient à une équipe adverse ;
 *   - l'appelant administre le tournoi, ou joue dans notre équipe de ce tournoi ;
 *   - le tournoi n'est pas clos (son historique ne bouge plus).
 *
 * Le nom retenu est celui du roster pour un joueur — c'est sous ce nom que ses
 * coéquipiers le connaissent —, sinon le nom affiché du profil.
 */
create function public.set_list_verified(player uuid, verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament uuid;
  v_kind       public.team_kind;
  v_name       text;
begin
  select tm.tournament_id, tm.kind
    into v_tournament, v_kind
  from public.players p
  join public.teams tm on tm.id = p.team_id
  where p.id = player;

  if v_tournament is null then
    raise exception 'Joueur introuvable.' using errcode = 'P0002';
  end if;

  if v_kind <> 'OPPONENT' then
    raise exception 'Seule une liste adverse se vérifie.' using errcode = '22023';
  end if;

  select p.name into v_name
  from public.players p
  join public.teams tm on tm.id = p.team_id
  where tm.tournament_id = v_tournament
    and tm.kind = 'OUR_TEAM'
    and p.user_id = auth.uid();

  if v_name is null and not public.can_manage_tournament(v_tournament) then
    raise exception 'Seuls les joueurs et le coach de l''équipe vérifient les listes.'
      using errcode = '42501';
  end if;

  if public.is_tournament_closed(v_tournament) then
    raise exception 'Ce tournoi est terminé : ses listes ne bougent plus.'
      using errcode = '42501';
  end if;

  if v_name is null then
    select coalesce(nullif(trim(pr.display_name), ''), pr.email, 'Coach')
      into v_name
    from public.profiles pr
    where pr.user_id = auth.uid();
  end if;

  update public.players
  set list_verified_at      = case when verified then now() end,
      list_verified_by      = case when verified then auth.uid() end,
      list_verified_by_name = case when verified then coalesce(v_name, 'Coach') end
  where id = player;
end;
$$;

revoke execute on function public.set_list_verified(uuid, boolean) from public, anon;
grant execute on function public.set_list_verified(uuid, boolean) to authenticated;

/*
 * Une vérification porte sur une version de la liste. Si le coach la corrige ensuite,
 * l'ancienne vérification ne vaut plus rien : elle est retirée, sauf quand la mise à jour
 * pose elle-même le drapeau.
 *
 * La note du coach n'en fait pas partie : c'est une analyse, pas la liste.
 */
create function public.reset_list_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.list_verified_at is not null
     and new.list_verified_at is not distinct from old.list_verified_at
     and (new.army, new.detachment, new.list_name, new.list_content, new.disposition)
         is distinct from
         (old.army, old.detachment, old.list_name, old.list_content, old.disposition) then
    new.list_verified_at := null;
    new.list_verified_by := null;
    new.list_verified_by_name := null;
  end if;
  return new;
end;
$$;

create trigger players_reset_list_verification
  before update on public.players
  for each row execute function public.reset_list_verification();
