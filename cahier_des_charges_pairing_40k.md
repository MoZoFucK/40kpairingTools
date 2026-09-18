# Cahier des charges — 40K Team Pairing Assistant

> Document destiné directement à un LLM de développement (Claude Code, Codex, etc.).
>
> Objectif : construire une application web légère permettant à une équipe Warhammer 40K de préparer ses estimés et d'assister le coach pendant le pairing d'un tournoi par équipes.

---

# 1. Vision du produit

Créer un outil web qui remplace l'Excel actuellement utilisé pour :

1. gérer notre équipe ;
2. importer les rosters adverses ;
3. permettre à chaque joueur de saisir ses estimés ;
4. présenter une matrice claire au coach ;
5. assister mécaniquement le coach pendant le pairing WTC ;
6. conserver l'historique des pairings.

L'application doit être conçue comme un **assistant de pairing**, pas comme un moteur d'optimisation.

Le coach reste entièrement responsable des décisions stratégiques.

## Principe fondamental

Le logiciel doit faire :

```text
Données
  ↓
Matrice d'estimés
  ↓
Choix humain du coach
  ↓
Conséquences mécaniques
  ↓
Choix humain du coach
  ↓
Pairing final
```

Il ne doit jamais faire :

```text
Données
  ↓
Algorithme
  ↓
"Meilleur pairing"
```

Il ne doit notamment jamais afficher :

- « meilleur choix » ;
- « pairing recommandé » ;
- « défenseur recommandé » ;
- « attaquant recommandé » ;
- « joueur à refuser » ;
- score d'optimisation ;
- classement des pairings ;
- prédiction du résultat.

Cette contrainte doit être respectée aussi bien dans l'UI que dans le code métier et les tests.

---

# 2. Contexte WTC

Le pairing doit respecter le protocole WTC applicable au tournoi.

Le site doit assister la saisie et la lecture du pairing, sans automatiser la décision stratégique.

Le règlement WTC 2025 décrit notamment un processus de défenseurs, propositions d'attaquants, refus puis répétition des étapes jusqu'à obtention des matchs.

**Ne pas hardcoder une interprétation personnelle du WTC.**

Pour la V1, implémenter le protocole utilisé par notre équipe, basé sur le pairing WTC pour des équipes de 6 joueurs, mais construire le moteur suffisamment générique pour supporter ultérieurement des équipes de 8 joueurs.

Référence de travail :
https://worldteamchampionship.com/wp-content/uploads/2025/04/2025-WTC40K-Event-Pack-10th-ed-v1.6.pdf

Avant un tournoi réel, le protocole doit être vérifié par rapport au règlement officiel applicable à cette édition.

---

# 3. Contraintes générales

## 3.1 Priorité

Le produit doit être :

- simple ;
- rapide ;
- lisible ;
- responsive ;
- utilisable sur PC ;
- utilisable sur téléphone pour la saisie des estimés ;
- utilisable sur tablette ;
- facilement déployable ;
- facile à maintenir ;
- adapté au vibe coding.

## 3.2 Pas de surarchitecture

Ne pas introduire inutilement :

- microservices ;
- Docker ;
- Redis ;
- RabbitMQ ;
- Hangfire ;
- backend séparé ;
- Kubernetes ;
- infrastructure complexe.

---

# 4. Stack technique imposée/recommandée

## Frontend / Backend

**Next.js + TypeScript**

Utiliser l'App Router.

Le backend doit rester dans Next.js via :

- Server Actions lorsque pertinent ;
- Route Handlers lorsque nécessaire.

Ne pas créer une API ASP.NET Core séparée.

## Base de données

**Supabase PostgreSQL**

Supabase fournit :

- PostgreSQL ;
- Auth ;
- Row Level Security ;
- Realtime ;
- Storage.

## Hosting

**Vercel**

Le déploiement cible est :

```text
GitHub
   ↓
Vercel
   ↓
Next.js
   ↓
Supabase
```

## UI

Utiliser :

- Bootstrap ou CSS Modules ;
- composants React simples ;
- éventuellement une bibliothèque UI légère si elle apporte une vraie valeur.

**Ne pas utiliser Tailwind CSS.**

## Excel

Utiliser **SheetJS / xlsx** pour lire les fichiers XLSX.

## Tests

- Vitest pour les tests unitaires ;
- Playwright pour les tests end-to-end.

---

# 5. Architecture cible

```text
40k-pairing/
│
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── team/
│   ├── estimates/
│   ├── opponents/
│   ├── rounds/
│   └── pairing/
│       └── [roundId]/
│
├── components/
│   ├── team/
│   ├── estimates/
│   ├── opponents/
│   ├── pairing/
│   └── ui/
│
├── lib/
│   ├── supabase/
│   ├── pairing/
│   ├── import/
│   └── validation/
│
├── types/
│
├── tests/
│
└── supabase/
    ├── migrations/
    └── seed/
```

Le découpage exact peut évoluer, mais les responsabilités doivent rester séparées.

---

# 6. Architecture métier

Le moteur de pairing doit être indépendant de React.

L'UI ne doit pas contenir la logique métier du pairing.

Créer un module dédié :

```text
lib/pairing/
```

avec notamment :

```typescript
PairingState
PairingAction
PairingStep
PairingEngine
```

Exemple conceptuel :

```typescript
interface PairingState {
  availableOurPlayers: string[];
  availableOpponentPlayers: string[];
  currentStep: number;
  actions: PairingAction[];
  matches: Match[];
}
```

Le moteur reçoit :

```text
état actuel
+
action humaine
```

et retourne :

```text
nouvel état
+
conséquences mécaniques
```

Aucune fonction du type :

```typescript
findBestPairing()
recommendDefender()
optimizePairing()
```

ne doit exister.

---

# 7. Nombre de joueurs

Le nombre de joueurs d'une équipe doit être configurable.

Exemples :

```text
6 joueurs
8 joueurs
```

Le code ne doit pas contenir de logique métier dépendant de constantes `6` dispersées.

La V1 doit être développée et testée prioritairement avec :

```text
6 vs 6
```

mais le modèle de données et le moteur doivent prévoir :

```text
N vs N
```

---

# 8. Utilisateurs et rôles

## PLAYER

Un joueur peut :

- consulter son équipe ;
- consulter les informations nécessaires sur les adversaires ;
- saisir ses estimés ;
- modifier ses estimés avant le verrouillage de la ronde/tournoi.

Il ne peut pas :

- modifier les estimés des autres joueurs ;
- modifier les rosters adverses ;
- réaliser un pairing ;
- modifier un pairing ;
- verrouiller une ronde.

## COACH

Le coach peut :

- gérer son équipe ;
- gérer les joueurs ;
- importer les équipes adverses ;
- modifier les rosters ;
- consulter toutes les estimations ;
- créer les rondes ;
- ouvrir/fermer les phases de saisie ;
- réaliser le pairing ;
- annuler/corriger un pairing ;
- enregistrer les tables ;
- verrouiller une ronde ;
- consulter l'historique.

## ADMIN

L'admin peut :

- gérer les utilisateurs ;
- gérer les équipes ;
- gérer les tournois ;
- gérer les permissions ;
- effectuer toutes les actions du coach.

---

# 9. Authentification

Utiliser **Supabase Auth**.

MVP :

- email + mot de passe ;
- récupération de mot de passe.

Une évolution vers magic link pourra être envisagée ultérieurement.

Les rôles applicatifs doivent être stockés côté base de données et contrôlés côté serveur.

Ne jamais considérer un rôle envoyé par le navigateur comme fiable.

---

# 10. Modèle de données

## 10.1 Tournament

```typescript
interface Tournament {
  id: string;
  name: string;
  teamSize: number;
  createdAt: string;
  updatedAt: string;
}
```

## 10.2 Team

```typescript
interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName?: string;
  createdAt: string;
  updatedAt: string;
}
```

Une équipe peut être :

```text
OUR_TEAM
OPPONENT
```

Ne pas nécessairement créer deux modèles différents.

## 10.3 Player

```typescript
interface Player {
  id: string;
  teamId: string;
  userId?: string;
  name: string;
  army: string;
  detachment?: string;
  listName?: string;
  createdAt: string;
  updatedAt: string;
}
```

`userId` est optionnel pour les joueurs adverses.

## 10.4 ArmyList

Si nécessaire, séparer les informations de joueur et de liste :

```typescript
interface ArmyList {
  id: string;
  playerId: string;
  army: string;
  detachment?: string;
  listName?: string;
  rawContent?: string;
}
```

`rawContent` permet de conserver la source importée pour affichage ou retraitement futur.

## 10.5 Estimate

```typescript
interface Estimate {
  id: string;
  playerId: string;
  opponentPlayerId: string;
  value: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  updatedAt: string;
}
```

MVP :

```text
1 → très défavorable
2 → défavorable
3 → équilibré
4 → favorable
5 → très favorable
```

La légende doit être centralisée/configurable et non répétée en dur dans tous les composants.

## 10.6 Round

```typescript
interface Round {
  id: string;
  tournamentId: string;
  number: number;
  opponentTeamId: string;
  scenario?: string;
  status:
    | "PREPARATION"
    | "ESTIMATES_OPEN"
    | "ESTIMATES_LOCKED"
    | "PAIRING"
    | "COMPLETED"
    | "LOCKED";
  createdAt: string;
  updatedAt: string;
}
```

## 10.7 PairingAction

```typescript
interface PairingAction {
  id: string;
  roundId: string;
  sequence: number;
  type: PairingActionType;
  playerId?: string;
  opponentPlayerId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

Exemples de types :

```text
SELECT_OUR_DEFENDER
SELECT_OPPONENT_DEFENDER
SELECT_OUR_ATTACKERS
SELECT_OPPONENT_ATTACKERS
SELECT_REFUSAL
ASSIGN_TABLE
CONFIRM_MATCH
UNDO
```

## 10.8 Match

```typescript
interface Match {
  id: string;
  roundId: string;
  ourPlayerId: string;
  opponentPlayerId: string;
  table?: number;
  createdAt: string;
}
```

Les scores ne sont pas nécessaires au MVP.

---

# 11. Relations principales

```text
Tournament
   │
   ├── Teams
   │      │
   │      └── Players
   │              │
   │              └── ArmyLists
   │
   └── Rounds
          │
          ├── PairingActions
          └── Matches

Player × OpponentPlayer
        │
        └── Estimate
```

---

# 12. Row Level Security

Utiliser Supabase RLS.

## Joueur

Un joueur peut :

- lire les données nécessaires à son tournoi ;
- créer/modifier ses propres estimés tant que la phase d'estimation est ouverte.

Il ne peut pas modifier les estimés des autres.

## Coach

Un coach d'une équipe peut :

- lire toutes les données de son tournoi ;
- modifier les données de son équipe ;
- gérer les équipes adverses ;
- gérer les rondes ;
- gérer les pairings.

## Admin

Accès complet.

Toutes les opérations sensibles doivent également être vérifiées côté serveur.

---

# 13. Gestion de l'équipe

Écran :

```text
Mon équipe

Nom : ADLC
Taille : 6

Joueurs

Morgan       Tyranides
Jonathan     Dark Angels
Jérôme       Necrons
Antoine      Thousand Sons
Marc         Astra Militarum
David        T'au
```

Actions coach :

```text
+ Ajouter un joueur
Modifier
Supprimer
```

La taille de l'équipe doit être visible.

---

# 14. Gestion des équipes adverses

Le coach doit pouvoir créer une équipe adverse :

```text
GSH
```

puis importer ou saisir ses joueurs/listes.

Les équipes rencontrées doivent être conservées dans l'historique du tournoi.

Exemple :

```text
Ronde 1 → GSH
Ronde 2 → Team X
Ronde 3 → Team Y
```

Les données ne doivent pas être supprimées après la ronde.

---

# 15. Import Excel / CSV

Le format des fichiers adverses peut varier.

Ne pas supposer un format unique.

Workflow :

```text
Importer
   ↓
Sélection du fichier
   ↓
Analyse
   ↓
Détection des colonnes
   ↓
Mapping
   ↓
Prévisualisation
   ↓
Validation
   ↓
Import
```

Exemple de mapping :

```text
Player        → Joueur
Faction       → Armée
Detachment    → Détachement
Army List     → Liste
```

Si une colonne ne peut pas être identifiée automatiquement, demander au coach de la sélectionner.

Afficher les erreurs avant import :

```text
❌ 1 joueur sans armée
❌ 1 doublon
❌ détachement manquant
```

Ne jamais importer partiellement sans avertissement.

---

# 16. UX des listes adverses

L'objectif n'est pas seulement de stocker les listes.

Le joueur doit pouvoir les **lire facilement afin d'améliorer son estimation**.

Créer une fiche lisible :

```text
┌─────────────────────────────────────┐
│ KEYRADIN                            │
│ NECRONS                             │
│ WAKENED DYNASTY                     │
├─────────────────────────────────────┤
│ Personnages                         │
│ Imotekh                             │
│ Overlord                            │
│ Technomancer                        │
│                                     │
│ Unités                              │
│ 20 Warriors                         │
│ 10 Immortals                        │
│ 6 Wraiths                           │
│ ...                                 │
└─────────────────────────────────────┘
```

Le contenu exact dépendra du fichier importé.

Prévoir un bouton :

```text
Voir la liste complète
```

depuis l'écran d'estimation.

---

# 17. Données de règles 40K

Ne pas intégrer une source externe complexe dans le MVP.

Préparer néanmoins le modèle pour pouvoir ultérieurement associer :

```text
Army
  ↓
ArmyRule
  ↓
Detachment
  ↓
DetachmentRule
```

Objectif V2 :

```text
📖 Règles importantes
```

permettant au joueur de comprendre rapidement les particularités de l'armée/détachement adverse.

Si une source externe est intégrée ultérieurement, elle devra être validée juridiquement et techniquement avant utilisation.

---

# 18. Saisie des estimés

## Vue joueur

Mobile-first :

```text
Mes estimés

Necrons
Keyradin                         [ 4 ]

Ultramarines
Uma                              [ 4 ]

Orks
LouisC                           [ 2 ]

Custodes
LeMoff                           [ 3 ]

              [ Enregistrer ]
```

L'enregistrement doit être immédiat.

Afficher :

```text
✓ Sauvegardé
```

ou un indicateur équivalent.

## Verrouillage

Avant tournoi :

```text
Estimés modifiables
```

Une fois la phase verrouillée :

```text
Lecture seule
```

Pendant le pairing :

```text
Estimés lecture seule
```

Le serveur doit faire respecter ce verrouillage.

---

# 19. Realtime

Le système doit supporter plusieurs utilisateurs simultanément.

Scénario :

```text
6 joueurs
   ↓
téléphones
   ↓
Supabase
   ↓
Coach
   ↓
matrice temps réel
```

Quand un joueur modifie son estimé :

```text
UPDATE Estimate
       ↓
Supabase Realtime
       ↓
Coach reçoit l'événement
       ↓
Matrice mise à jour
```

Ne pas demander au coach de rafraîchir manuellement.

Les abonnements Realtime doivent être limités au tournoi concerné.

---

# 20. Matrice d'estimés

La matrice est le cœur de l'application.

Exemple :

```text
                  ADVERSAIRES

             Key  Uma  Louis  Pasta  Urknar  LeMoff

Dark Angels   4    4     4     3      2       4
Necrons       3    4     4     4      3       2
TS            4    2     4     3      3       2
Tyranides     3    5     1     4      4       4
AM            3    2     3     4      5       1
T'au          2    3     2     4      3       4
```

## Règles UX

Toujours afficher :

- nom du joueur ;
- faction ;
- nom de liste si disponible ;
- valeur numérique.

Les couleurs peuvent aider mais ne doivent jamais être la seule information.

Les joueurs déjà appariés doivent être visuellement atténués.

---

# 21. Matrice en mode pairing

La matrice doit devenir interactive.

Exemple :

```text
                   Key   Uma   Louis   Pasta

Dark Angels         4     4      4      3
Necrons             3     4      4      4
Tyranides           3     5      1      4
T'au                2     3      2      4
```

Si un joueur est éliminé :

```text
Dark Angels         —     —      —      —
```

ou affichage atténué selon UX.

Le but est que le coach puisse comprendre immédiatement :

```text
qui est encore disponible
contre qui
avec quel estimé
```

---

# 22. Écran Pairing Live

C'est l'écran prioritaire du produit.

Desktop :

```text
┌──────────────────────────────────────────────────────────┐
│ RONDE 3 — ADLC vs GSH                                   │
│ Scénario : ...                                          │
├───────────────────────┬──────────────────────────────────┤
│ NOTRE ÉQUIPE          │ ADVERSAIRES                     │
│                       │                                  │
│ Dark Angels           │ Necrons - Keyradin              │
│ Necrons               │ Ultramarines - Uma              │
│ Thousand Sons         │ Orks - LouisC                   │
│ Tyranides             │ Votann - Pastabolo               │
│ Astra Militarum       │ Death Guard - Urknar             │
│ T'au                  │ Custodes - LeMoff                │
├───────────────────────┴──────────────────────────────────┤
│ MATRICE                                                 │
│                                                         │
│ ...                                                     │
├──────────────────────────────────────────────────────────┤
│ ÉTAPE DE PAIRING                                        │
│                                                         │
│ Défenseur adverse : Custodes                            │
│                                                         │
│ Nos attaquants proposés :                              │
│ [ Tyranides ]    [ Thousand Sons ]                      │
│                                                         │
│ [ Choisir ]       [ Choisir ]                           │
└──────────────────────────────────────────────────────────┘
```

Sur mobile, prévoir une adaptation en sections/accordéons.

---

# 23. Workflow de pairing

## Étape générique

Le moteur doit gérer :

```text
availableOurPlayers
availableOpponentPlayers
currentStep
currentSelections
actions
matches
```

## Principe

À chaque action :

1. vérifier que le choix est légal ;
2. enregistrer l'action ;
3. recalculer l'état ;
4. afficher les conséquences ;
5. passer à l'étape suivante lorsque nécessaire.

---

# 24. Sélection d'un défenseur

L'interface doit afficher uniquement les joueurs disponibles.

```text
Choisir notre défenseur

[ Dark Angels ]
[ Necrons ]
[ Thousand Sons ]
[ Tyranides ]
[ Astra Militarum ]
[ T'au ]
```

Après sélection :

```text
✓ Défenseur sélectionné : Tyranides
```

---

# 25. Sélection des attaquants

Le coach sélectionne manuellement les attaquants autorisés par le protocole.

L'interface doit empêcher :

- sélectionner un joueur déjà utilisé ;
- sélectionner deux fois le même joueur ;
- sélectionner un nombre incorrect d'attaquants.

---

# 26. Refus

Le système présente les choix résultant mécaniquement du protocole.

Exemple :

```text
Adversaire propose :

Tyranides       4
Necrons         2

Choisir le refus :

[ Refuser Tyranides ]
[ Refuser Necrons ]
```

Après décision humaine :

```text
Match :
Tyranides ↔ Custodes

Joueur restant :
Necrons
```

Ne jamais écrire :

```text
"Refuser Necrons est préférable"
```

ou équivalent.

---

# 27. Conséquences mécaniques

Après chaque choix humain, afficher uniquement ce qui découle logiquement de ce choix.

Exemple :

```text
CHOIX VALIDÉ

Match :
Tyranides ↔ Custodes

Estimé :
4

Joueurs encore disponibles :
Dark Angels
Necrons
Thousand Sons
Astra Militarum
T'au
```

La valeur `4` est une donnée saisie par un joueur.

Elle ne constitue pas une recommandation.

---

# 28. Historique des actions

Chaque action doit être journalisée.

Exemple :

```text
09:32
Notre défenseur : T'au

09:33
Défenseur adverse : Custodes

09:34
Nos attaquants :
- Tyranides
- Necrons

09:35
Refus :
- Necrons

09:35
Match :
T'au vs Custodes
```

L'historique doit être ordonné par `sequence`.

---

# 29. Undo

Avant verrouillage :

```text
← Annuler la dernière action
```

L'undo doit être implémenté comme une opération métier contrôlée.

Ne pas simplement supprimer arbitrairement des lignes en base sans recalculer l'état.

Deux stratégies acceptables :

1. reconstruire l'état depuis l'historique ;
2. utiliser des snapshots contrôlés.

Pour le MVP, privilégier la reconstruction depuis les `PairingAction`.

---

# 30. Gestion des tables

Prévoir l'enregistrement :

```text
tableChoiceTeam
tableNumber
```

Exemple :

```text
Table Choice : ADLC

Match :
Tyranides vs Custodes

Table :
3
```

Le numéro de table doit être configurable.

---

# 31. Pairing final

Afficher :

```text
RONDE 1 — ADLC vs GSH

Table 1
Dark Angels vs Ultramarines

Table 2
T'au vs Votann

Table 3
Tyranides vs Custodes

Table 4
Astra Militarum vs Death Guard

Table 5
Thousand Sons vs Necrons

Table 6
...
```

Validation finale :

```text
✓ Tous les joueurs sont appariés
✓ Aucun joueur n'est utilisé deux fois
✓ Toutes les listes adverses sont appariées
✓ Toutes les tables sont valides
```

---

# 32. Historique des rondes

Conserver :

```text
Ronde 1 → équipe adverse + listes + estimés + pairing
Ronde 2 → équipe adverse + listes + estimés + pairing
Ronde 3 → ...
```

Le coach doit pouvoir ouvrir une ancienne ronde en lecture seule.

---

# 33. Résultats

Le projet est volontairement limité au pairing.

Ne pas implémenter dans le MVP :

- classement ;
- score général du tournoi ;
- gestion des points de victoire ;
- classement des joueurs ;
- statistiques avancées.

Il peut néanmoins être utile de conserver les matchs et les informations de pairing.

---

# 34. UX générale

## Priorités

### 1. Lisibilité

Le coach doit pouvoir lire la matrice en quelques secondes.

### 2. Rapidité

Un choix doit nécessiter très peu d'actions.

### 3. Aucun écran inutile

Pendant le pairing, ne pas faire naviguer le coach entre plusieurs pages.

### 4. Mobile

Les joueurs doivent pouvoir saisir leurs estimés depuis leur téléphone.

### 5. Desktop

Le coach doit avoir une vue large et dense.

---

# 35. Raccourcis clavier

Prévoir éventuellement :

```text
Esc → fermer modal
Enter → confirmer
Backspace → undo si autorisé
```

Ne pas faire des raccourcis clavier une dépendance au fonctionnement.

---

# 36. États UI

Prévoir clairement :

```text
Loading
Saving
Saved
Error
Locked
Unavailable
Selected
Completed
```

Exemple :

```text
[ 4 ] ✓
```

après sauvegarde.

---

# 37. Gestion des erreurs

Les erreurs doivent être compréhensibles.

Mauvais :

```text
Error 409
```

Préférer :

```text
Impossible de modifier cet estimé :
la phase d'estimation est verrouillée.
```

---

# 38. Validation serveur

Toute règle importante doit être vérifiée côté serveur.

Exemples :

- rôle utilisateur ;
- équipe autorisée ;
- ronde verrouillée ;
- joueur disponible ;
- adversaire disponible ;
- sélection légale ;
- doublon ;
- pairing complet.

Ne jamais considérer une validation React comme suffisante.

---

# 39. Sécurité

Minimum :

- Supabase Auth ;
- RLS ;
- validation serveur ;
- protection des données entre équipes ;
- aucune donnée sensible dans les logs ;
- impossibilité de modifier une ronde verrouillée ;
- impossibilité pour un joueur de modifier les estimés d'un autre.

---

# 40. Realtime — détails

Le Realtime est nécessaire surtout pour :

- estimés ;
- état du pairing éventuellement visible par plusieurs coachs.

Créer des subscriptions limitées au contexte courant.

Éviter :

```text
subscribe to entire database
```

Préférer :

```text
subscribe to estimates
WHERE tournament_id = currentTournament
```

Si plusieurs personnes utilisent le pairing simultanément, les actions de pairing doivent être persistées avant d'être diffusées.

---

# 41. Gestion de concurrence

Le coach est le principal acteur du pairing.

Pour éviter deux actions contradictoires :

- vérifier côté serveur la version/état courant ;
- rejeter une action basée sur un état périmé ;
- rafraîchir/recharger l'état si nécessaire.

Le système ne doit jamais produire un pairing invalide à cause d'une course entre deux clients.

---

# 42. Import et données externes

L'import doit conserver suffisamment d'information pour permettre une amélioration future de la présentation des listes.

Conserver éventuellement :

```text
raw file
raw row
parsed fields
```

Ne pas dépendre dès la V1 d'un scraper externe.

---

# 43. Design system minimal

Créer quelques composants réutilisables :

```text
Button
Card
Badge
Modal
Select
Toast
Table
PlayerCard
ArmyCard
EstimateCell
PairingStep
MatchCard
```

Éviter de créer une abstraction générique pour chaque élément HTML.

---

# 44. Couleurs des estimés

Une aide visuelle peut être utilisée.

Par exemple :

```text
1 → très défavorable
2 → défavorable
3 → équilibré
4 → favorable
5 → très favorable
```

Mais :

- toujours afficher le chiffre ;
- ne jamais dépendre uniquement de la couleur ;
- prévoir une bonne lisibilité ;
- respecter les besoins d'accessibilité.

---

# 45. Responsive

## Mobile

Priorité :

```text
saisie estimés
lecture liste
consultation équipe
```

## Desktop

Priorité :

```text
matrice
pairing live
historique
gestion équipe
```

---

# 46. Tests unitaires du moteur de pairing

Tester au minimum :

```text
6 vs 6
```

Scénarios :

1. sélection d'un défenseur ;
2. sélection d'un défenseur déjà utilisé ;
3. sélection d'un attaquant disponible ;
4. sélection d'un attaquant déjà utilisé ;
5. mauvais nombre d'attaquants ;
6. refus ;
7. création du match ;
8. passage à l'étape suivante ;
9. dernier match ;
10. undo ;
11. pairing complet ;
12. tentative de modification après verrouillage.

Tester également :

```text
8 vs 8
```

au niveau structurel, même si le protocole exact 8 joueurs n'est pas encore développé.

---

# 47. Tests Realtime

Tester :

```text
Joueur A modifie estimé
        ↓
Base
        ↓
Coach reçoit changement
```

et :

```text
Phase verrouillée
        ↓
Joueur tente modification
        ↓
Serveur refuse
```

---

# 48. Tests E2E

Créer au minimum un parcours :

```text
Login coach
 ↓
Créer tournoi
 ↓
Créer équipe
 ↓
Ajouter joueurs
 ↓
Importer équipe adverse
 ↓
Créer ronde
 ↓
Joueurs saisissent estimés
 ↓
Coach voit matrice
 ↓
Démarrer pairing
 ↓
Effectuer pairing complet
 ↓
Verrouiller ronde
 ↓
Consulter historique
```

---

# 49. CI/CD

Le repository GitHub doit contenir une CI simple.

À chaque Pull Request :

```text
npm ci
npm run lint
npm test
npm run build
```

Les tests Playwright peuvent être exécutés séparément si leur coût est trop important pour chaque PR.

Vercel gère le déploiement.

---

# 50. Variables d'environnement

Prévoir :

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

et les secrets serveur si nécessaire.

Ne jamais committer :

```text
.env
.env.local
```

Prévoir :

```text
.env.example
```

---

# 51. README

Le repository doit contenir un README expliquant :

- objectif ;
- stack ;
- installation ;
- variables d'environnement ;
- lancement local ;
- migrations Supabase ;
- seed ;
- tests ;
- déploiement Vercel.

Commandes attendues :

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

---

# 52. Seed de développement

Créer un seed permettant de lancer rapidement un environnement réaliste :

```text
Tournament
  ADLC

6 joueurs

6 joueurs adverses

Estimés 1..5

Ronde 1
```

Cela permettra au LLM et au développeur de tester l'interface sans tout saisir manuellement.

---

# 53. Données de démonstration

Les données de test doivent être clairement fictives.

Exemple :

```text
Notre équipe
- Dark Angels
- Necrons
- Thousand Sons
- Tyranides
- Astra Militarum
- T'au

Adversaires
- Necrons
- Ultramarines
- Orks
- Votann
- Death Guard
- Custodes
```

Ne pas utiliser de vraies données personnelles.

---

# 54. Roadmap de développement

Le développement doit être réalisé en **vertical slices**.

Ne pas générer toute l'application en une seule fois.

Chaque étape doit laisser le projet compilable.

---

## Phase 1 — Bootstrap

Créer :

- Next.js ;
- TypeScript ;
- Supabase ;
- configuration environnement ;
- UI de base ;
- ESLint ;
- Vitest ;
- structure de dossiers.

Validation :

```bash
npm run lint
npm test
npm run build
```

---

## Phase 2 — Auth

Créer :

- login ;
- logout ;
- session ;
- rôles.

Validation :

- joueur connecté ;
- coach connecté ;
- accès protégé.

---

## Phase 3 — Équipe

Créer :

- tournoi ;
- équipe ;
- joueurs ;
- gestion de taille d'équipe.

Validation :

```text
Créer une équipe de 6
Ajouter 6 joueurs
Modifier un joueur
```

---

## Phase 4 — Adversaires

Créer :

- équipe adverse ;
- joueurs adverses ;
- listes ;
- import CSV/XLSX ;
- prévisualisation ;
- mapping.

Validation :

```text
Importer un Excel
→ voir prévisualisation
→ corriger mapping
→ importer
```

---

## Phase 5 — Estimés

Créer :

- écran joueur ;
- matrice coach ;
- validation 1..5 ;
- sauvegarde ;
- verrouillage.

Validation :

```text
Joueur modifie un estimé
→ coach le voit
```

---

## Phase 6 — Realtime

Créer :

- subscription Supabase ;
- mise à jour de matrice sans refresh ;
- gestion des erreurs réseau.

Validation :

```text
Navigateur A
        ↓
modifie estimation

Navigateur B
        ↓
voit immédiatement le changement
```

---

## Phase 7 — Pairing Engine

Créer le moteur indépendant de React.

Créer des tests avant l'UI complète.

Validation :

```text
6 vs 6
pairing complet
aucun doublon
undo
état cohérent
```

---

## Phase 8 — Pairing Live UI

Créer :

- écran plein pairing ;
- matrice interactive ;
- sélection défenseur ;
- sélection attaquants ;
- refus ;
- matchs ;
- conséquences ;
- undo ;
- tables.

---

## Phase 9 — Historique

Créer :

- historique des rondes ;
- historique des actions ;
- consultation en lecture seule.

---

## Phase 10 — Polish

Faire :

- responsive ;
- accessibilité ;
- gestion erreurs ;
- loading ;
- performances ;
- tests E2E ;
- README ;
- CI.

---

# 55. Règle de développement pour le LLM

**Ne pas tout développer d'un coup.**

À chaque étape :

1. inspecter le code existant ;
2. comprendre l'architecture ;
3. implémenter uniquement la fonctionnalité demandée ;
4. écrire les tests ;
5. lancer lint ;
6. lancer tests ;
7. lancer build ;
8. corriger les erreurs ;
9. seulement ensuite passer à l'étape suivante.

Ne pas créer d'abstractions prématurées.

Ne pas modifier des parties fonctionnelles sans raison.

Ne pas ajouter de dépendance npm sans justification.

---

# 56. Règle spéciale concernant le pairing

Avant d'implémenter le moteur de pairing :

1. identifier précisément les règles WTC applicables ;
2. comparer le protocole avec celui du fichier Excel fourni ;
3. documenter explicitement les différences ;
4. implémenter uniquement le workflow validé.

Le moteur doit être déterministe.

Exemple :

```text
Input
+
Action
=
Output
```

À input identique et action identique :

```text
Output identique
```

---

# 57. Règle spéciale concernant les estimés

Un estimé est une **donnée utilisateur**, pas une donnée calculée.

Ne jamais calculer automatiquement :

```text
"4.3"
"meilleur matchup"
"moyenne recommandée"
"score de pairing"
```

La matrice doit simplement restituer :

```text
joueur
×
adversaire
×
estimé
```

---

# 58. Règle spéciale concernant les recommandations

Aucun composant, endpoint, service ou utilitaire ne doit produire une recommandation stratégique.

Interdit :

```typescript
getRecommendedPairing()
getBestMatchup()
getOptimalDefense()
rankPossiblePairings()
calculateBestRefusal()
```

Autorisé :

```typescript
getAvailablePlayers()
getAvailableOpponents()
getEstimate()
getPossibleSelections()
getCurrentPairingState()
getResultingState()
```

La différence est essentielle.

---

# 59. Future V2

Ne pas développer maintenant, mais garder l'architecture compatible avec :

- équipes de 8 ;
- plusieurs protocoles de pairing ;
- règles d'armée/détachement ;
- meilleure présentation des listes ;
- PWA ;
- mode offline ;
- statistiques historiques ;
- export PDF ;
- export Excel ;
- partage public ;
- mode spectateur.

---

# 60. Future intégration des règles

Objectif :

```text
Liste adverse
     ↓
Faction
     ↓
Détachement
     ↓
Résumé des règles importantes
```

Cela doit aider le joueur à comprendre rapidement la liste avant de saisir son estimé.

Mais cette fonctionnalité ne doit pas bloquer le MVP.

---

# 61. Critères d'acceptation MVP

L'application est considérée comme fonctionnelle lorsque :

## Auth

- un joueur peut se connecter ;
- un coach peut se connecter ;
- les permissions sont respectées.

## Équipe

- une équipe peut être créée ;
- sa taille est configurable ;
- les joueurs peuvent être ajoutés.

## Adversaire

- une équipe adverse peut être créée ;
- ses listes peuvent être importées ;
- le mapping Excel fonctionne ;
- les erreurs sont signalées.

## Estimés

- chaque joueur peut saisir ses estimés ;
- uniquement de 1 à 5 ;
- le coach voit la matrice ;
- la matrice se met à jour en temps réel ;
- les estimés sont verrouillés pendant le pairing.

## Pairing

- le coach peut créer une ronde ;
- le workflow 6 joueurs fonctionne ;
- les joueurs indisponibles sont correctement exclus ;
- les doublons sont impossibles ;
- les choix sont historisés ;
- undo fonctionne ;
- les matchs finaux sont corrects ;
- les tables peuvent être affectées.

## Historique

- une ronde terminée reste consultable ;
- le pairing est conservé.

---

# 62. Résumé technique pour le LLM

La stack cible est :

```text
Next.js
React
TypeScript
Supabase
PostgreSQL
Supabase Auth
Supabase Realtime
Vercel
SheetJS
Vitest
Playwright
Bootstrap/CSS Modules
```

Architecture :

```text
                   ┌──────────────────┐
                   │      Joueurs     │
                   │    téléphone     │
                   └────────┬─────────┘
                            │
                            ▼
┌───────────────┐     ┌───────────────┐
│     Coach     │────▶│    Next.js    │
│    desktop    │     │               │
└───────────────┘     └───────┬───────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             ┌─────────────┐    ┌─────────────┐
             │  Supabase   │    │   Pairing   │
             │ PostgreSQL  │    │   Engine    │
             │ Auth        │    │             │
             │ Realtime    │    │ déterministe│
             └─────────────┘    └─────────────┘
```

---

# 63. Principe produit final

Le résultat attendu n'est pas un "bot de pairing".

C'est un :

> **tableau de pairing numérique, temps réel, lisible et ergonomique, qui permet au coach de prendre ses décisions beaucoup plus rapidement que dans Excel.**

La valeur du produit repose sur :

```text
Excel actuel
      ↓
Données séparées
      ↓
Saisie mobile
      ↓
Realtime
      ↓
Matrice claire
      ↓
Pairing Live
      ↓
Historique fiable
```

Le coach conserve toujours la décision.

---

# 64. Instruction finale au LLM développeur

Commencer par la **Phase 1 uniquement**.

Ne pas implémenter les phases suivantes tant que la phase courante n'est pas :

```text
✓ fonctionnelle
✓ testée
✓ lintée
✓ buildée
```

À chaque étape, expliquer brièvement :

- ce qui a été créé ;
- les décisions techniques prises ;
- les commandes de validation ;
- les éventuels points restant à décider.

Ne pas inventer de règles WTC non présentes dans ce cahier des charges.

En cas d'ambiguïté sur le protocole de pairing, **ne pas choisir arbitrairement** : documenter l'ambiguïté et demander confirmation avant d'implémenter la logique concernée.
