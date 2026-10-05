-- Suppression du scénario et de l'attribution des tables — passage à la V11.
--
-- En V10, chaque ronde avait un scénario (mission primaire et déploiement, par exemple
-- « B - Supply Drop / Tipping Point ») et le pairing se concluait par l'attribution des
-- tables. En V11, la mission primaire découle du croisement des dispositions des deux
-- joueurs (lib/lists/missions.ts), et table comme déploiement se choisissent autrement.
-- Les deux colonnes ne portent donc plus rien que l'application sache exploiter.
--
-- À APPLIQUER APRÈS LE DÉPLOIEMENT du code qui ne les lit plus : une version antérieure de
-- l'application encore en ligne sélectionne ces colonnes, et chacune de ses pages
-- échouerait dès leur disparition. Le code actuel fonctionne avec ou sans elles.

alter table public.rounds drop column scenario;

alter table public.matches drop column table_number;
