# Plan d'implémentation — 40K Team Pairing Assistant

Référence : [cahier_des_charges_pairing_40k.md](cahier_des_charges_pairing_40k.md)
Protocole : [docs/protocole-pairing.md](docs/protocole-pairing.md)

## Contraintes structurantes

| Contrainte | Conséquence technique |
|---|---|
| Aucune recommandation stratégique (§1, §58) | Le moteur expose `getAvailable*` / `getResultingState`, jamais de tri ni de score. Règle ESLint dédiée pour le faire respecter en CI. |
| N vs N configurable (§7) | Aucune constante `6` dans le métier. Le protocole est une donnée de configuration. |
| Pas de surarchitecture (§3.2) | Pas de Docker, donc Supabase cloud et non `supabase start` local. |

## Décisions techniques

- **Next.js 16 + React 19 + TypeScript strict**, App Router. Server Actions pour les
  mutations, Route Handler pour l'upload de fichier d'import. Node 22 requis (`.nvmrc`).
- **Bootstrap 5** pour l'UI, plus un petit design system maison (§43) pour les composants
  spécifiques (matrice, cellule d'estimé, étape de pairing).
- **Supabase cloud** (free tier). Migrations SQL versionnées dans `supabase/migrations/`.
- **Moteur de pairing** : réducteur pur `(state, action) => Result`, sans dépendance React
  ni Supabase, event-sourcé depuis `pairing_actions`. L'undo rejoue les N-1 actions (§29).
- **Concurrence (§41)** : contrainte d'unicité SQL sur `(round_id, sequence)`. Deux coachs
  simultanés → le second est rejeté par la base, sans verrou applicatif.

## Modèle de données

```
tournaments(id, name, team_size)
teams(id, tournament_id, name, short_name, kind: OUR_TEAM|OPPONENT)
players(id, team_id, user_id?, name, army, detachment?, list_name?)
army_lists(id, player_id, army, detachment?, list_name?, raw_content?, raw_row jsonb)
estimates(id, player_id, opponent_player_id, value 1..5, comment?)   -- unique(player_id, opponent_player_id)
rounds(id, tournament_id, number, opponent_team_id, status)   -- scénario retiré en V11 (0011)
pairing_actions(id, round_id, sequence, type, player_id?, opponent_player_id?, metadata jsonb)
                                                                     -- unique(round_id, sequence)
matches(id, round_id, our_player_id, opponent_player_id, origin)  -- tables retirées en V11 (0011)
profiles(user_id, role: PLAYER|COACH|ADMIN, team_id)
```

`profiles` est l'ajout nécessaire non listé au cahier des charges : les rôles doivent vivre
en base (§9) et servent de base à toutes les policies RLS.

`matches.origin` distingue `SELECTED` / `REJECTED_PAIR` / `REMAINING_PAIR` pour reproduire
les sections « Rejetés » et « Oubliés » du classeur.

## Lots

Chaque lot se termine par `npm run lint && npm test && npm run build` vert et laisse le
projet déployable.

| Lot | Contenu | Critère de fin |
|---|---|---|
| 1. Bootstrap ✅ | Next.js, TS strict, ESLint + règle anti-recommandation, Vitest, Bootstrap 5, structure de dossiers, `.env.example`, CI GitHub Actions | La page d'accueil build et se déploie |
| 2. Auth & rôles ✅ | Supabase Auth email/mdp, `profiles`, middleware de session, `requireCoach()` / `requirePlayer()` | Un joueur et un coach se connectent, une route coach est refusée au joueur |
| 3. Tournoi & équipe ✅ | CRUD tournoi / équipe / joueurs, `teamSize` configurable, RLS | Créer une équipe de 6, ajouter et modifier des joueurs |
| 4. Adversaires & listes ✅ | Équipes adverses, saisie assistée des joueurs et des listes, référentiel de règles d'armée et de détachement (§17), fiche de liste lisible (§16). **L'import de fichier a été abandonné** au profit de la saisie : voir « Écarts au cahier des charges ». | Saisir une équipe adverse de 6 joueurs sans retaper deux fois la même règle |
| 5. Estimés ✅ | Écran joueur mobile-first à sauvegarde immédiate, matrice coach (2 orientations), validation 1..5 serveur, verrouillage par statut de ronde, fiche liste adverse (§16) | Un joueur saisit, le coach voit ; phase verrouillée → le serveur refuse |
| 6. Realtime ✅ | Subscription Supabase filtrée sur le tournoi, matrice mise à jour sans refresh, reconnexion réseau | Deux navigateurs, mise à jour instantanée |
| 7. Moteur de pairing ✅ | `lib/pairing/` pur, en TDD, avant toute UI. Les 12 scénarios du §46. Protocole en configuration. | Pairing 6v6 complet, aucun doublon, undo, déterminisme |
| 8. Pairing Live UI ✅ | Écran unique, matrice interactive, défenseurs, attaquants, refus, conséquences, journal, undo, tables | Parcours de pairing complet sans quitter l'écran |
| 9. Historique ✅ | Rondes passées en lecture seule, pairing, estimés et journal ordonné par `sequence` | Rouvrir la ronde 1 après la ronde 3 |
| 10. Polish ✅ | Responsive, accessibilité, états UI (§36), messages d'erreur métier (§37), E2E Playwright, seed, README | Le parcours E2E du §48 passe |

**Les dix lots sont livrés.** Chacun a été validé par `npm run lint && npm test &&
npm run build`, et les policies RLS ont été éprouvées avec de vrais jetons après chaque
migration — deux d'entre elles avaient dû être corrigées faute de ce contrôle (0002 et
0005).

## Écarts au cahier des charges

**L'import Excel / CSV du §15 est abandonné.** Décision prise après analyse : le §15 décrit
le lot le plus complexe du MVP (détection de colonnes sur format inconnu, écran de mapping,
prévisualisation) pour charger six lignes à la fois. Les données adverses tiennent d'ailleurs
en une chaîne de texte par joueur dans le classeur de l'équipe.

Il est remplacé par une saisie assistée : autocomplétion des armées et détachements déjà
connus, et pré-remplissage des règles depuis un référentiel partagé. La dépendance SheetJS
imposée par le §4 devient donc sans objet.

**Les règles d'armée et de détachement du §17 entrent dans le MVP**, en saisie manuelle.
Le §17 les réservait à une V2 en supposant une source externe ; elles sont ici saisies par
le coach, ce qui écarte la question juridique qu'il soulevait.

## Questions ouvertes

1. ~~**Attribution des tables**~~ — **close.** L'ancienne règle (dé pour désigner qui
   choisit en premier, puis alternance) n'a plus cours en v11. Rien n'est implémenté, la
   saisie du numéro de table reste libre. Voir
   [docs/protocole-pairing.md](docs/protocole-pairing.md).
2. **8 vs 8** — le moteur est paramétré pour le supporter, mais la règle métier reste à
   confirmer. Aucun test métier 8v8 avant validation.
3. **Conformité WTC** — le protocole implémenté est celui de l'équipe, à confronter au
   règlement officiel avant un tournoi réel.
