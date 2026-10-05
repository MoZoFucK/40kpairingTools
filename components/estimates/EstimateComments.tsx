import { estimateLevel } from "@/lib/estimates/scale";
import { getCell, type Matrix, type MatrixPlayer } from "@/lib/estimates/matrix";
import type { EstimateValue } from "@/types/domain";

/**
 * Commentaires laissés par les joueurs avec leurs estimés.
 *
 * Restitués tels quels, dans l'ordre de la matrice — nos joueurs, puis leurs adversaires —,
 * jamais triés par valeur : l'ordre ne doit rien suggérer (§57). Une liste plutôt qu'une
 * infobulle sur la case : au téléphone, une infobulle ne s'ouvre pas.
 *
 * `availableIds`, s'il est fourni, grise les commentaires des matchs déjà formés — le
 * coach n'a plus à les relire pendant le pairing.
 */
export function EstimateComments({
  matrix,
  availableIds,
}: {
  matrix: Matrix;
  availableIds?: ReadonlySet<string>;
}) {
  const entries: {
    our: MatrixPlayer;
    opponent: MatrixPlayer;
    value: EstimateValue | null;
    comment: string;
  }[] = [];

  for (const our of matrix.ourPlayers) {
    for (const opponent of matrix.opponentPlayers) {
      const cell = getCell(matrix, our.id, opponent.id);
      if (cell?.comment) {
        entries.push({ our, opponent, value: cell.value, comment: cell.comment });
      }
    }
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <details className="mt-3" open>
      <summary className="small fw-semibold">
        Commentaires des joueurs ({entries.length})
      </summary>
      <ul className="list-group list-group-flush mt-2">
        {entries.map(({ our, opponent, value, comment }) => {
          const faded =
            availableIds !== undefined &&
            !(availableIds.has(our.id) && availableIds.has(opponent.id));

          return (
            <li
              key={`${our.id}:${opponent.id}`}
              className={`list-group-item px-0 small ${faded ? "text-body-secondary opacity-50" : ""}`}
            >
              <span className="fw-semibold">{our.name}</span> contre{" "}
              <span className="fw-semibold">{opponent.name}</span>{" "}
              {value !== null ? (
                <span
                  className={`badge ${estimateLevel(value).className}`}
                  title={estimateLevel(value).label}
                >
                  {value}
                </span>
              ) : null}
              <div className="mt-1">« {comment} »</div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
