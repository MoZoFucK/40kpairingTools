# 40K Team Pairing Assistant

Application web qui remplace le classeur Excel utilisé par l'équipe pour préparer ses
estimés et assister le coach pendant le pairing d'un tournoi Warhammer 40 000 par équipes.

**C'est un assistant, pas un moteur d'optimisation.** L'outil restitue les données saisies
et les conséquences mécaniques de chaque choix. Il ne recommande jamais un pairing, un
défenseur, un attaquant ni un refus. Le coach reste seul responsable des décisions.

- Cahier des charges : [cahier_des_charges_pairing_40k.md](cahier_des_charges_pairing_40k.md)
- Plan d'implémentation : [PLAN.md](PLAN.md)
- Protocole de pairing : [docs/protocole-pairing.md](docs/protocole-pairing.md)

## Stack

Next.js 16 (App Router) · TypeScript · React 19 · Bootstrap 5 · Supabase (PostgreSQL, Auth,
Realtime) · Vitest · Playwright · déploiement Vercel.

## Installation

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run dev
```

L'application démarre sur http://localhost:3000.

> Node 22 est requis (voir `.nvmrc`). `@supabase/supabase-js` déprécie les versions
> antérieures, et son client Realtime a besoin du `WebSocket` global apparu en Node 22.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, exposée au navigateur |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur, jamais exposée. Migrations et seed uniquement. |

`.env` et `.env.local` ne doivent jamais être commités. Voir [.env.example](.env.example).

## Supabase

Un projet Supabase hébergé est nécessaire : le CLI local repose sur Docker, exclu par le
cahier des charges. Le plan gratuit suffit pour une équipe.

> Sur le plan gratuit, un projet est mis en pause après environ une semaine sans activité.
> Penser à le réveiller depuis le dashboard la veille d'un tournoi.

### Appliquer les migrations

Les migrations SQL vivent dans `supabase/migrations/`, numérotées et à appliquer dans
l'ordre. Le plus simple, sans installer d'outil : dashboard Supabase → **SQL Editor** →
coller le contenu du fichier → **Run**.

### Créer un compte

Les comptes ne s'auto-créent pas : c'est l'administrateur qui les ouvre, depuis le
dashboard Supabase → **Authentication** → **Add user**. Tout compte créé reçoit
automatiquement le rôle `PLAYER`.

### Attribuer un rôle

```bash
node scripts/set-role.mjs morgan@example.com COACH
```

Le script utilise `SUPABASE_SECRET_KEY` et contourne la RLS : c'est un outil
d'administration, jamais un chemin applicatif.

### Jeu de démonstration

```bash
npm run seed
```

Crée un tournoi complet et fictif (§53) : deux équipes de 6, listes adverses, règles
d'armée et de détachement, notes du coach, une ronde et une matrice d'estimés remplie. Le
script est rejouable — il remplace le tournoi portant le même nom et ne touche à rien
d'autre.

Pour recetter la saisie côté joueur, il faut un compte rattaché à une fiche : sans ce
lien, un joueur connecté ne voit rien du tournoi.

```bash
node scripts/seed.mjs --name "Recette joueur" --player joueur@example.com
```

Le compte est rattaché à la première fiche de l'équipe et **ses estimés sont laissés
vides** — c'est lui qui va les saisir. Ceux des autres joueurs sont remplis, la matrice du
coach reste donc réaliste.

| Option | Rôle |
|---|---|
| `--coach <email>` | Propriétaire du tournoi (par défaut : le premier COACH trouvé) |
| `--player <email>` | Compte rattaché à une fiche joueur |
| `--name "<nom>"` | Nom du tournoi (par défaut : `Tournoi de démonstration`) |

### Import du classeur Excel

```bash
npm run import:xlsx -- "Retour L3 - 40k.xlsx"
```

Charge le classeur de l'équipe : joueurs, équipes adverses rencontrées, listes, rondes
avec leur scénario, matrice d'estimés, et le déroulé du pairing pour les rondes dont la
feuille est complète.

Le script est rejouable : il remplace le tournoi portant le même nom (`Retour L3` par
défaut, modifiable via `IMPORT_TOURNAMENT_NAME`) et ne touche à rien d'autre.

Il **transcrit** le classeur, il ne déduit rien : les matchs sont lus tels qu'ils sont
inscrits dans le bloc « Résumé Ronde », et une feuille incomplète voit son pairing ignoré
plutôt que reconstitué. Le lecteur XLSX est écrit à la main dans `scripts/lib/xlsx.mjs`,
sans dépendance.

## Commandes

```bash
npm run dev       # serveur de développement
npm run lint      # ESLint, dont la règle qui interdit toute recommandation stratégique
npm test          # tests unitaires Vitest
npm run test:e2e  # parcours de bout en bout Playwright
npm run build     # build de production
npm run seed      # jeu de données de démonstration
npm run import:xlsx -- <fichier.xlsx>   # import du classeur de l'équipe
```

### Tests de bout en bout

Ils tournent contre le projet Supabase réel, sur le jeu de données du seed : le cahier des
charges exclut Docker, donc pas de base jetable locale.

```bash
npm run seed
npm run test:e2e
```

Les identifiants des comptes de recette se renseignent dans `.env.local`
(`E2E_COACH_EMAIL`, `E2E_COACH_PASSWORD`, `E2E_PLAYER_EMAIL`, `E2E_PLAYER_PASSWORD`).

Playwright pilote par défaut le **Chrome installé sur la machine** plutôt que son propre
binaire : `playwright install` passe par `cdn.playwright.dev`, que certains réseaux
d'entreprise bloquent. Pour revenir au navigateur embarqué :

```bash
npx playwright install chromium
E2E_BROWSER_CHANNEL= npm run test:e2e
```

## Structure

```
app/          routes App Router
components/   composants React, dont le design system minimal
lib/          métier — pairing, estimés, rondes, validation, accès Supabase
types/        types du domaine
tests/        tests unitaires Vitest
e2e/          parcours Playwright
scripts/      outils d'administration (rôles, seed)
supabase/     migrations SQL
docs/         protocole de pairing et décisions
```

Le moteur de pairing (`lib/pairing/`) est volontairement indépendant de React et de
Supabase : il prend un état et une action, et retourne un nouvel état. Une règle ESLint
dédiée interdit dans ce module et dans l'UI de pairing tout identifiant évoquant une
recommandation (`best`, `recommend`, `optimal`, `suggest`, `ranking`…).

## Déploiement

GitHub → Vercel → Supabase. Renseigner les variables d'environnement dans les réglages du
projet Vercel. La CI exécute `lint`, `test` et `build` sur chaque Pull Request. Les tests Playwright ne
tournent pas à chaque PR : ils exigent un projet Supabase et coûtent bien plus cher.
