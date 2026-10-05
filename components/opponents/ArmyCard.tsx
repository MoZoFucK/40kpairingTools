import { dispositionLabel } from "@/lib/lists/dispositions";
import { parseListSections } from "@/lib/validation/army";

/**
 * Fiche d'une liste adverse (§16).
 *
 * Elle n'existe pas pour stocker la liste, mais pour que le joueur la lise vite et bien
 * avant de poser son estimé. C'est le même composant qui sert dans la gestion des équipes
 * adverses et dans l'écran d'estimation.
 */

export interface ArmyCardData {
  name: string;
  army: string;
  detachment: string | null;
  listName: string | null;
  listContent: string | null;
  disposition?: string | null;
  notes?: string | null;
  armyRule?: string | null;
  detachmentRule?: string | null;
}

/**
 * Note du coach sur une liste.
 *
 * Elle signale ce que la liste seule ne montre pas — une interaction entre deux unités,
 * un piège. Elle est donc placée avant la liste et non après : une note qu'il faut
 * chercher ne sert à rien.
 *
 * C'est une observation factuelle sur l'adversaire, pas une consigne de jeu : le coach
 * reste seul à décider du pairing (§58).
 */
export function CoachNote({ notes }: { notes: string }) {
  return (
    <div className="alert alert-warning py-2 px-3 mb-0" role="note">
      <span className="fw-semibold d-block small text-uppercase">Note du coach</span>
      <span className="small" style={{ whiteSpace: "pre-wrap" }}>
        {notes}
      </span>
    </div>
  );
}

export function ArmyCard({
  player,
  compact = false,
  listInitiallyOpen = false,
  footer,
}: {
  player: ArmyCardData;
  compact?: boolean;
  /**
   * Liste détaillée dépliée d'emblée. Repliée par défaut : dans une grille d'équipe, une
   * liste de vingt lignes étire toute la rangée et noie les fiches voisines. Le joueur qui
   * a demandé lui-même à voir la liste la reçoit dépliée.
   */
  listInitiallyOpen?: boolean;
  /**
   * Actions rendues dans la carte, en pied. Placées après la carte, elles déborderaient :
   * la carte occupe toute la hauteur de sa colonne pour aligner les fiches d'une rangée.
   */
  footer?: React.ReactNode;
}) {
  const sections = player.listContent ? parseListSections(player.listContent) : [];

  return (
    <article className="card h-100">
      <div className="card-body">
        <h3 className="h6 mb-1">{player.name}</h3>
        <p className="text-body-secondary mb-0">{player.army}</p>
        {player.detachment ? (
          <p className="text-body-secondary small mb-0">{player.detachment}</p>
        ) : null}
        {player.listName ? (
          <p className="fst-italic small text-body-secondary mb-0">{player.listName}</p>
        ) : null}
        {dispositionLabel(player.disposition) ? (
          <p className="mb-0 mt-2">
            <span className="badge text-bg-dark">
              {dispositionLabel(player.disposition)}
            </span>
          </p>
        ) : null}

        {player.notes ? (
          <div className="mt-3">
            <CoachNote notes={player.notes} />
          </div>
        ) : null}

        {player.armyRule || player.detachmentRule ? (
          <div className="mt-3">
            <h4 className="text-uppercase text-body-secondary small mb-2">
              Règles importantes
            </h4>
            {player.armyRule ? (
              <p className="small mb-2">
                <span className="fw-semibold">{player.army}</span> — {player.armyRule}
              </p>
            ) : null}
            {player.detachmentRule && player.detachment ? (
              <p className="small mb-0">
                <span className="fw-semibold">{player.detachment}</span> —{" "}
                {player.detachmentRule}
              </p>
            ) : null}
          </div>
        ) : null}

        {!compact && sections.length > 0 ? (
          <details className="mt-3 pt-3 border-top" open={listInitiallyOpen}>
            <summary className="small text-body-secondary mb-2">
              Liste détaillée ·{" "}
              {sections.reduce((total, section) => total + section.entries.length, 0)} lignes
            </summary>
            {sections.map((section) => (
              <div key={section.title} className="mb-3">
                <h4 className="text-uppercase text-body-secondary small mb-1">
                  {section.title}
                </h4>
                <ul className="list-unstyled small mb-0">
                  {section.entries.map((entry, index) => (
                    <li key={`${section.title}-${index}`}>{entry}</li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        ) : null}

        {!compact && sections.length === 0 ? (
          <p className="text-body-secondary small mt-3 mb-0">
            Aucune liste détaillée n&apos;a été saisie pour ce joueur.
          </p>
        ) : null}
      </div>
      {footer ? <div className="card-footer bg-transparent">{footer}</div> : null}
    </article>
  );
}
