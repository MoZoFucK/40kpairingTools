-- Listes adverses et règles d'armée / détachement — cahier des charges §16 et §17.
--
-- L'import de fichier a été abandonné au profit d'une saisie assistée. Le coach saisit,
-- et le joueur lit une fiche lisible avant de poser son estimé (§16).

-- Contenu intégral de la liste, tel que collé par le coach. Séparé des champs structurés
-- pour rester lisible sans retraitement (§42).
--
-- Pas de table `army_lists` distincte (§10.4, « si nécessaire ») : un joueur n'a qu'une
-- liste, un join ne servirait à rien. La colonne est volumineuse, donc jamais de
-- `select("*")` sur `players` — les écrans de matrice ne lisent que ce dont ils ont besoin.
alter table public.players add column list_content text;

-- ---------------------------------------------------------------------------
-- Règles d'armée et de détachement
-- ---------------------------------------------------------------------------
--
-- Le modèle du §17 : Army → ArmyRule → Detachment → DetachmentRule.
--
-- Ces règles sont saisies une fois et réutilisées partout : les mêmes armées reviennent
-- de ronde en ronde et de tournoi en tournoi. Elles ne sont rattachées à aucun tournoi —
-- ce sont des données de jeu, pas des données d'équipe, et elles n'ont donc rien de
-- confidentiel.
--
-- L'armée et le détachement sont du texte libre, pas des entités : imposer un référentiel
-- fermé obligerait à le tenir à jour à chaque sortie de codex.

create table public.army_rules (
  id         uuid primary key default gen_random_uuid(),
  army       text not null check (length(trim(army)) > 0),
  rule       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clé insensible à la casse et aux espaces : « necrons » et « Necrons » sont la même armée.
create unique index army_rules_key on public.army_rules (lower(trim(army)));

create trigger army_rules_touch
  before update on public.army_rules
  for each row execute function public.touch_updated_at();

create table public.detachment_rules (
  id         uuid primary key default gen_random_uuid(),
  army       text not null check (length(trim(army)) > 0),
  detachment text not null check (length(trim(detachment)) > 0),
  rule       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index detachment_rules_key
  on public.detachment_rules (lower(trim(army)), lower(trim(detachment)));

create index detachment_rules_army_idx on public.detachment_rules (lower(trim(army)));

create trigger detachment_rules_touch
  before update on public.detachment_rules
  for each row execute function public.touch_updated_at();

alter table public.army_rules enable row level security;
alter table public.detachment_rules enable row level security;

-- Lecture ouverte à tout utilisateur connecté : le joueur en a besoin pour comprendre la
-- liste adverse avant d'estimer.
create policy army_rules_select
  on public.army_rules for select
  to authenticated
  using (true);

create policy detachment_rules_select
  on public.detachment_rules for select
  to authenticated
  using (true);

-- Écriture réservée au coach et à l'admin (§8).
create policy army_rules_write
  on public.army_rules for all
  to authenticated
  using (public.current_user_role() in ('COACH', 'ADMIN'))
  with check (public.current_user_role() in ('COACH', 'ADMIN'));

create policy detachment_rules_write
  on public.detachment_rules for all
  to authenticated
  using (public.current_user_role() in ('COACH', 'ADMIN'))
  with check (public.current_user_role() in ('COACH', 'ADMIN'));
