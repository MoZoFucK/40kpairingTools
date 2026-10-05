import { dispositionShortLabel } from "@/lib/lists/dispositions";
import { missionsOfMatch } from "@/lib/lists/missions";
import { MissionSummary } from "./MissionSummary";

/**
 * Mission primaire d'un affrontement, déduite des deux dispositions.
 *
 * `detailed` développe le croisement et le résumé de la mission, pour aider le joueur à
 * poser son estimé. Sans ce mode, seul le nom est affiché : pendant le pairing, l'écran
 * est déjà dense et le coach n'a besoin que du nom.
 *
 * Rien n'est affiché tant qu'une des deux dispositions manque : une mission fausse serait
 * pire que pas de mission du tout.
 */
export function MissionBadge({
  ourDisposition,
  opponentDisposition,
  detailed = false,
}: {
  ourDisposition: string | null | undefined;
  opponentDisposition: string | null | undefined;
  detailed?: boolean;
}) {
  const { ours, theirs } = missionsOfMatch(ourDisposition, opponentDisposition);

  if (!ours) {
    return null;
  }

  if (!detailed) {
    return (
      <span className="badge text-bg-info" title="Mission primaire">
        {ours.name}
      </span>
    );
  }

  /*
   * Un `<details>` natif : le volet se replie sans script, et le nom des deux missions
   * reste lisible replié — c'est souvent tout ce que le joueur a besoin de revoir.
   */
  return (
    <details className="border rounded p-2" open>
      <summary className="small">
        <span className="text-uppercase text-body-secondary">Mission primaire</span>{" "}
        <span className="fw-semibold">{ours.name}</span>
        {theirs ? (
          <span className="text-body-secondary"> · la sienne : {theirs.name}</span>
        ) : null}
      </summary>

      <div className="text-body-secondary small mt-2">
        {dispositionShortLabel(ourDisposition)} contre{" "}
        {dispositionShortLabel(opponentDisposition)}
      </div>

      <div className="mt-2">
        <div className="small fw-semibold">Ta mission : {ours.name}</div>
        {ours.summary ? (
          <MissionSummary summary={ours.summary} className="small mt-1 mb-0" />
        ) : null}
      </div>

      {theirs ? (
        <div className="mt-2 pt-2 border-top">
          <div className="small fw-semibold">Sa mission : {theirs.name}</div>
          {theirs.summary ? (
            <MissionSummary
              summary={theirs.summary}
              className="small text-body-secondary mt-1 mb-0"
            />
          ) : null}
        </div>
      ) : null}
    </details>
  );
}
