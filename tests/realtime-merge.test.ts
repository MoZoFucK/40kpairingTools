import { describe, expect, it } from "vitest";
import { buildMatrix, getCell, type MatrixPlayer } from "@/lib/estimates/matrix";
import type { RawEstimate } from "@/lib/estimates/matrix";

/**
 * Fusion des événements temps réel.
 *
 * La logique testée est celle de `useEstimatesChannel`, réécrite ici sans React : un
 * estimé reçu remplace celui de la même paire plutôt que de s'y ajouter. C'est la seule
 * partie du temps réel qui puisse se tromper silencieusement — un doublon de paire ferait
 * afficher une valeur périmée selon l'ordre d'arrivée.
 */

function merge(
  current: readonly RawEstimate[],
  incoming: RawEstimate,
): readonly RawEstimate[] {
  const next = current.filter(
    (estimate) =>
      !(
        estimate.player_id === incoming.player_id &&
        estimate.opponent_player_id === incoming.opponent_player_id
      ),
  );
  return [...next, incoming];
}

function remove(
  current: readonly RawEstimate[],
  gone: { player_id: string; opponent_player_id: string },
): readonly RawEstimate[] {
  return current.filter(
    (estimate) =>
      !(
        estimate.player_id === gone.player_id &&
        estimate.opponent_player_id === gone.opponent_player_id
      ),
  );
}

const OURS: MatrixPlayer[] = [
  { id: "us-1", name: "Morgan", army: "Tyranides" },
  { id: "us-2", name: "Marc", army: "Astra Militarum" },
];
const THEIRS: MatrixPlayer[] = [{ id: "them-1", name: "Keyradin", army: "Necrons" }];

describe("fusion des estimés reçus en direct", () => {
  it("ajoute un estimé inconnu", () => {
    const merged = merge([], { player_id: "us-1", opponent_player_id: "them-1", value: 4 });
    expect(merged).toHaveLength(1);
  });

  it("remplace l'estimé d'une paire au lieu de le dupliquer", () => {
    const first: RawEstimate[] = [
      { player_id: "us-1", opponent_player_id: "them-1", value: 2 },
    ];
    const merged = merge(first, {
      player_id: "us-1",
      opponent_player_id: "them-1",
      value: 5,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]?.value).toBe(5);
  });

  it("ne touche pas aux estimés des autres paires", () => {
    const current: RawEstimate[] = [
      { player_id: "us-1", opponent_player_id: "them-1", value: 2 },
      { player_id: "us-2", opponent_player_id: "them-1", value: 3 },
    ];
    const merged = merge(current, {
      player_id: "us-1",
      opponent_player_id: "them-1",
      value: 4,
    });

    expect(merged).toHaveLength(2);
    const matrix = buildMatrix(OURS, THEIRS, merged);
    expect(getCell(matrix, "us-1", "them-1")?.value).toBe(4);
    expect(getCell(matrix, "us-2", "them-1")?.value).toBe(3);
  });

  it("retire un estimé supprimé", () => {
    const current: RawEstimate[] = [
      { player_id: "us-1", opponent_player_id: "them-1", value: 2 },
      { player_id: "us-2", opponent_player_id: "them-1", value: 3 },
    ];
    const after = remove(current, { player_id: "us-1", opponent_player_id: "them-1" });

    expect(after).toHaveLength(1);
    expect(getCell(buildMatrix(OURS, THEIRS, after), "us-1", "them-1")?.value).toBeNull();
  });

  it("aboutit au même état quel que soit l'ordre d'arrivée", () => {
    const events: RawEstimate[] = [
      { player_id: "us-1", opponent_player_id: "them-1", value: 1 },
      { player_id: "us-2", opponent_player_id: "them-1", value: 3 },
    ];

    const forward = events.reduce<readonly RawEstimate[]>(merge, []);
    const backward = [...events].reverse().reduce<readonly RawEstimate[]>(merge, []);

    const a = buildMatrix(OURS, THEIRS, forward);
    const b = buildMatrix(OURS, THEIRS, backward);
    expect(a.cells).toEqual(b.cells);
  });
});
