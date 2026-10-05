import { ESTIMATE_SCALE } from "@/lib/estimates/scale";
import {
  GUIDE_CYCLE,
  GUIDE_MISSIONS,
  GUIDE_PAIRING_CLOSING,
  GUIDE_PAIRING_STEP,
  GUIDE_PRINCIPLE,
  GUIDE_ROLES,
} from "@/lib/help/guide";
import { DISPOSITIONS } from "@/lib/lists/dispositions";
import { SIX_VS_SIX, stepCount } from "@/lib/pairing/protocol";
import {
  areEstimatesEditable,
  isPairingReachable,
  isRoundLocked,
  ROUND_STATUS_LABEL,
} from "@/lib/rounds/status";
import type { RoundStatus } from "@/types/domain";

export const metadata = { title: "Guide — 40K Team Pairing Assistant" };

/** Statuts dans l'ordre du déroulé : celui de leur déclaration. */
const STATUSES = Object.keys(ROUND_STATUS_LABEL) as RoundStatus[];

const TEAM_SIZES = [6, 8] as const;

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span className="text-success" aria-label="oui">
      ✓
    </span>
  ) : (
    <span className="text-body-secondary" aria-label="non">
      —
    </span>
  );
}

/**
 * Guide — le déroulé complet d'un tournoi.
 *
 * Public : un bêta-testeur doit pouvoir le lire avant même d'avoir un compte.
 *
 * Tout ce qui découle d'une règle du code est calculé ici depuis le module qui la porte
 * — statuts, nombre d'étapes, échelle, dispositions. Le guide ne peut donc pas décrire un
 * comportement que l'application n'a plus. Seule la prose vit dans lib/help/guide.ts.
 */
export default function GuidePage() {
  return (
    <div className="container py-4" style={{ maxWidth: "52rem" }}>
      <h1 className="h4 mb-2">Guide</h1>
      <p className="lead text-body-secondary mb-4">{GUIDE_PRINCIPLE}</p>

      <section className="mb-5">
        <h2 className="h5 mb-3">Qui fait quoi</h2>
        <div className="row g-3">
          {GUIDE_ROLES.map((entry) => (
            <div key={entry.role} className="col-12 col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">{entry.role}</h3>
                  <ul className="small mb-0 ps-3">
                    {entry.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h2 className="h5 mb-3">Le déroulé d&apos;un tournoi</h2>
        <ol className="list-group list-group-numbered">
          {GUIDE_CYCLE.map((step) => (
            <li key={step.title} className="list-group-item">
              <span className="fw-semibold">{step.title}</span>{" "}
              <span className="badge text-bg-secondary ms-1">{step.who}</span>
              <div className="small text-body-secondary mt-1">{step.body}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-5">
        <h2 className="h5 mb-2">Les statuts d&apos;une ronde</h2>
        <p className="small text-body-secondary">
          Sur la page d&apos;une ronde, les boutons à côté du statut ne sont pas des liens :
          ils font passer la ronde au statut nommé. Les retours en arrière restent possibles
          jusqu&apos;au verrouillage, qui est définitif.
        </p>
        <div className="table-responsive">
          <table className="table table-bordered align-middle small mb-0">
            <thead>
              <tr>
                <th scope="col">Statut</th>
                <th scope="col" className="text-center">
                  Saisie des estimés
                </th>
                <th scope="col" className="text-center">
                  Écran de pairing
                </th>
                <th scope="col" className="text-center">
                  Ronde modifiable
                </th>
              </tr>
            </thead>
            <tbody>
              {STATUSES.map((status) => (
                <tr key={status}>
                  <th scope="row" className="fw-semibold">
                    {ROUND_STATUS_LABEL[status]}
                  </th>
                  <td className="text-center">
                    <Mark on={areEstimatesEditable(status)} />
                  </td>
                  <td className="text-center">
                    <Mark on={isPairingReachable(status)} />
                  </td>
                  <td className="text-center">
                    <Mark on={!isRoundLocked(status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-5">
        <h2 className="h5 mb-2">Le pairing</h2>
        <p className="small text-body-secondary">
          {TEAM_SIZES.map(
            (size) =>
              `${stepCount({ ...SIX_VS_SIX, teamSize: size })} étapes en ${size} contre ${size}`,
          ).join(", ")}
          , puis une clôture automatique. À chaque étape :
        </p>
        <ol className="small">
          {GUIDE_PAIRING_STEP.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p className="small mb-0">{GUIDE_PAIRING_CLOSING}</p>
      </section>

      <section className="mb-5">
        <h2 className="h5 mb-2">Dispositions et missions primaires</h2>
        <p className="small">{GUIDE_MISSIONS}</p>
        <ul className="small mb-0">
          {DISPOSITIONS.map((disposition) => (
            <li key={disposition.value}>
              <span className="fw-semibold">{disposition.label}</span>{" "}
              <span className="text-body-secondary">— {disposition.gloss}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="h5 mb-3">Échelle des estimés</h2>
        <ul className="list-group list-group-flush" style={{ maxWidth: "24rem" }}>
          {ESTIMATE_SCALE.map((level) => (
            <li
              key={level.value}
              className={`list-group-item d-flex justify-content-between ${level.className}`}
            >
              <span className="fw-semibold">{level.value}</span>
              <span>{level.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
