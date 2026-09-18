# Protocole de pairing — 6 vs 6

> **Statut : à valider par le coach avant implémentation définitive du moteur.**
>
> Ce document est le livrable exigé par le §56 du cahier des charges : identifier les
> règles applicables, les comparer au fichier Excel de l'équipe, documenter les écarts.
>
> Il décrit le protocole **effectivement utilisé par ADLC**, reconstruit par rétro-ingénierie
> du classeur `Retour L3 - 40k.xlsx`. Il ne prétend pas être une transcription du règlement
> WTC officiel : voir la section « Écarts et points non couverts ».

## Source

Classeur `Retour L3 - 40k.xlsx`, onglets `Ronde 1`, `Ronde 2`, `Ronde 4`, `Ronde 5`
et `Template Ronde x`.

Les rondes 1, 2 et 5 sont complètes et se comportent de façon identique.
La ronde 4 est partiellement remplie, la ronde 3 est vide.

## Vocabulaire

| Terme Excel | Sens |
|---|---|
| Pairing eux | Le tour où **l'adversaire défend** et où nous proposons des attaquants |
| Pairing nous | Le tour où **nous défendons** et où l'adversaire propose des attaquants |
| Retenu (Oui/Non) | L'attaquant que le défenseur a choisi d'affronter |
| Rejetés | Le match formé par les deux attaquants refusés lors de l'étape 2 |
| Oubliés | Le match formé par les deux derniers joueurs restants |

## Déroulé

Pour 6 joueurs par équipe : **2 étapes**, puis clôture automatique.

### Étape (répétée 2 fois)

1. **Désignation des défenseurs.** Chaque équipe désigne un défenseur parmi ses joueurs
   encore disponibles. Les deux désignations sont **simultanées** : au sein d'une même
   étape, notre défenseur ne peut pas être l'un de nos attaquants.
2. **Proposition d'attaquants.** Chaque équipe propose **2 attaquants** face au défenseur
   adverse, choisis parmi ses joueurs disponibles, son propre défenseur de l'étape exclu.
3. **Choix du défenseur.** Chaque défenseur retient **1 des 2** attaquants proposés
   contre lui. Ce couple devient un match définitif.
4. **Libération.** L'attaquant non retenu **retourne dans le pool des joueurs disponibles**
   et peut être proposé à nouveau lors de l'étape suivante.

Chaque étape consomme donc **2 joueurs par équipe** (le défenseur et l'attaquant retenu)
et produit **2 matchs**.

### Clôture

Après l'étape 2, il reste 2 joueurs par équipe. Les 2 derniers matchs sont **entièrement
mécaniques, sans aucun choix humain** :

- **Rejetés** — les deux attaquants refusés *lors de l'étape 2* s'affrontent.
- **Oubliés** — les deux joueurs restants s'affrontent.

Total : 4 matchs choisis + 2 matchs mécaniques = 6 matchs.

## Points d'implémentation

- **L'ordre des deux attaquants n'a aucune signification.** En ronde 2 étape 2, c'est
  « Leur Attaquant 2 » qui est retenu. Le moteur manipule un ensemble de 2, pas une liste
  ordonnée.
- **Quand l'adversaire défend, la décision de refus lui appartient.** Le coach la *saisit*,
  il ne la prend pas. L'UI doit refléter cette différence de nature (« Ils ont retenu … »
  contre « Choisir le refus »).
- **Le pool des refusés n'est pas éliminé.** Un joueur refusé à l'étape 1 reste sélectionnable
  à l'étape 2, comme défenseur ou comme attaquant.

## Preuves

### Ronde 1 — ADLC vs GSH

| | Nous | Eux |
|---|---|---|
| Étape 1 — défenseurs | T'au | Custodes (LeMoff) |
| Étape 1 — nos attaquants | Tyranides *(retenu)*, Thousand Sons | |
| Étape 1 — leurs attaquants | | Votann (Pastabolo) *(retenu)*, Ork (LouisC) |
| Étape 2 — défenseurs | Astra Militarum | Ultramarines (Uma) |
| Étape 2 — nos attaquants | Dark Angels *(retenu)*, Necrons | |
| Étape 2 — leurs attaquants | | Death Guard (Urknar) *(retenu)*, Ork (LouisC) |

Matchs obtenus : Tyranides–LeMoff, T'au–Pastabolo, Dark Angels–Uma, Astra Militarum–Urknar.
Rejetés : Necrons–LouisC. Oubliés : Thousand Sons–Keyradin.

`LouisC`, refusé à l'étape 1, est bien re-proposé à l'étape 2 → confirme la remise au pool.

### Ronde 2 — ADLC vs MTB

Matchs : Thousand Sons–Z0rr0, T'au–N4sgull, Tyranides–Raphi, Astra Militarum–Kthelmir.
Rejetés : Necrons–Andhrim. Oubliés : Dark Angels–Jintoh.

`Jintoh` avait été proposé puis refusé à l'étape 1, et se retrouve pourtant dans « Oubliés » :
la catégorie « Oubliés » n'est donc pas « jamais sélectionné », c'est simplement « les deux
joueurs restants une fois les rejetés de l'étape 2 appariés ».

### Ronde 5 — ADLC vs LTA

Matchs : T'au–La Loutre, Tyranides–S@rd, Necrons–Sideus, Astra Militarum–Maniaka.
Rejetés : Thousand Sons–Pac. Oubliés : Dark Angels–Joe.Gillian.

### Preuve de la simultanéité des défenseurs

Onglet `Ronde 1`, colonne `I` (« Dispo Notre Attaquant 1 ») de l'étape 1 : elle liste
Dark Angels, Necrons, Thousand Sons, Tyranides, Astra Militarum — soit 5 joueurs, T'au exclu.
T'au est notre défenseur de cette même étape. La formule Excel exclut donc bien le défenseur
courant du pool d'attaquants de la même étape.

## Écarts et points non couverts

1. **Attribution des tables — question close, sans implémentation.**

   Les cellules `Table :` sont vides sur les 5 rondes, et la règle n'était donc pas
   observable dans le classeur. Le coach l'a précisée : un dé départageait les deux équipes
   pour savoir laquelle choisissait la première, puis le choix alternait.

   **Cette règle n'a plus cours en v11**, et n'est donc pas implémentée. La saisie du
   numéro de table reste libre, sans automatisme — ce qui convient quelle que soit la règle
   retenue à l'avenir. Ne pas coder l'ancienne règle « au cas où » : elle serait fausse dès
   le premier tournoi.
2. **Conformité WTC.** Le protocole ci-dessus est celui de l'équipe, reconstitué depuis des
   rondes jouées en 10e édition. Il doit être confronté au règlement officiel applicable
   (WTC 40K Event Pack 2025 v1.6) avant un tournoi réel.

   **Le passage en v11 impose de tout revérifier** : la règle d'attribution des tables a
   déjà changé (point 1), rien ne garantit que le reste du protocole soit resté identique.
   Les tests `tests/pairing-engine.test.ts` rejouent trois rondes réelles et tomberont si le
   moteur est modifié — mais ils ne peuvent pas détecter que le règlement, lui, a bougé.
3. **8 vs 8 — protocole retenu, non observé.**

   Non observable dans le classeur. Le coach l'a décrit comme « pareil qu'en 6v6, avec une
   proposition d'attaquant en plus ». Cette formulation recouvrait deux protocoles
   incompatibles ; l'ambiguïté a été levée avec lui.

   **Retenu : une étape supplémentaire**, soit 3 étapes de 2 attaquants, même règle de
   clôture. Le moteur le supporte sans modification — `stepCount()` dérive 3 étapes de
   `teamSize = 8` — et `tests/pairing-engine.test.ts` couvre désormais un pairing 8v8
   complet.

   **Écartée : 3 attaquants proposés par défenseur.** Deux attaquants seraient alors refusés
   à chaque étape au lieu d'un, et la règle de clôture (« Rejetés » = les deux attaquants
   refusés de la dernière étape) ne désignerait plus une paire unique. Le moteur refuse
   explicitement `attackersPerProposal !== 2` pour cette raison.

   Cette lecture reste une reconstitution, jamais observée sur une partie réelle : elle doit
   être confrontée au règlement avant un tournoi à 8.
4. **Scores.** Le classeur contient TOS / Score sur 20 / Score sur 100. Hors périmètre MVP
   (cahier des charges §33).
