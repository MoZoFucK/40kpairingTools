-- Notes du coach sur une liste — prolonge le §16.
--
-- Le §16 veut que le joueur lise vite une liste adverse avant d'estimer. La liste seule ne
-- suffit pas toujours : ce qui compte est souvent une interaction entre deux unités, que
-- seul un œil averti repère. Le coach peut désormais l'écrire.
--
-- Distinct de `list_content`, qui est la source importée conservée telle quelle (§42) :
-- cette colonne porte une analyse, pas une transcription. Les mélanger rendrait impossible
-- de retraiter la liste sans perdre les notes.
--
-- Aucune policy à ajouter : la colonne hérite de celles de `players` (migration 0003).
-- Le coach écrit, tout participant au tournoi lit — c'est exactement ce qu'on veut, la note
-- n'ayant d'intérêt que si les joueurs la voient au moment d'estimer.
alter table public.players add column notes text;

comment on column public.players.notes is
  'Analyse libre du coach sur la liste : combos à surveiller, pièges, unités clés.';
