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

  return (
    <div className="border rounded p-2">
      <div className="text-uppercase text-body-secondary small mb-1">Mission primaire</div>

      <div className="fw-semibold">{ours.name}</div>
      <div className="text-body-secondary small">
        {dispositionShortLabel(ourDisposition)} contre{" "}
        {dispositionShortLabel(opponentDisposition)}
      </div>

      {ours.summary ? (
        <MissionSummary summary={ours.summary} className="small mt-2 mb-0" />
      ) : null}

      {theirs ? (
        <div className="small text-body-secondary mt-2">
          Sa mission à lui : <span className="fw-semibold">{theirs.name}</span>
        </div>
      ) : null}
    </div>
  );
}
