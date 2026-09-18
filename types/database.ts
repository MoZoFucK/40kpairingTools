/**
 * Schéma de la base, tenu à la main en miroir de `supabase/migrations/`.
 *
 * Il pourra être remplacé par une génération `supabase gen types` quand le schéma se
 * stabilisera ; en attendant, l'écrire à la main évite d'ajouter le CLI à la boucle de
 * développement.
 *
 * La forme (`Relationships`, `Views`, `Functions`…) est imposée par supabase-js : sans
 * elle, l'inférence de `select()` retombe sur `never`.
 *
 * Les lignes sont déclarées avec `type` et non `interface` : une interface ne reçoit pas
 * d'index signature implicite en TypeScript, donc elle ne satisfait pas le
 * `Record<string, unknown>` attendu par supabase-js, et l'inférence retombe sur `never`.
 */

import type {
  EstimateValue,
  MatchOrigin,
  RoundStatus,
  TeamKind,
  UserRole,
} from "@/types/domain";
import type { Side } from "@/lib/pairing/types";
import type { Disposition } from "@/lib/lists/dispositions";

export type ProfileRow = {
  user_id: string;
  role: UserRole;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type TournamentRow = {
  id: string;
  name: string;
  team_size: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TeamRow = {
  id: string;
  tournament_id: string;
  kind: TeamKind;
  name: string;
  short_name: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: string;
  team_id: string;
  user_id: string | null;
  name: string;
  army: string;
  detachment: string | null;
  list_name: string | null;
  list_content: string | null;
  notes: string | null;
  disposition: Disposition | null;
  created_at: string;
  updated_at: string;
};

export type ArmyRuleRow = {
  id: string;
  army: string;
  rule: string;
  created_at: string;
  updated_at: string;
};

export type DetachmentRuleRow = {
  id: string;
  army: string;
  detachment: string;
  rule: string;
  created_at: string;
  updated_at: string;
};

export type RoundRow = {
  id: string;
  tournament_id: string;
  number: number;
  opponent_team_id: string;
  scenario: string | null;
  status: RoundStatus;
  created_at: string;
  updated_at: string;
};

export type EstimateRow = {
  id: string;
  player_id: string;
  opponent_player_id: string;
  /** Dénormalisé par trigger, pour permettre un abonnement Realtime limité au tournoi. */
  tournament_id: string;
  value: EstimateValue;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type PairingActionType =
  | "SELECT_DEFENDER"
  | "PROPOSE_ATTACKERS"
  | "RETAIN_ATTACKER";

export type PairingActionRow = {
  id: string;
  round_id: string;
  sequence: number;
  type: PairingActionType;
  side: Side;
  player_ids: string[];
  created_by: string | null;
  created_at: string;
};

export type MatchRow = {
  id: string;
  round_id: string;
  our_player_id: string;
  opponent_player_id: string;
  origin: MatchOrigin;
  step_index: number;
  table_number: number | null;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Pick<ProfileRow, "user_id"> & Partial<ProfileRow>;
        Update: Partial<Pick<ProfileRow, "display_name" | "role" | "email">>;
        Relationships: [];
      };
      tournaments: {
        Row: TournamentRow;
        Insert: Pick<TournamentRow, "name" | "created_by"> & Partial<TournamentRow>;
        Update: Partial<Pick<TournamentRow, "name" | "team_size">>;
        Relationships: [];
      };
      teams: {
        Row: TeamRow;
        Insert: Pick<TeamRow, "tournament_id" | "kind" | "name"> & Partial<TeamRow>;
        Update: Partial<Pick<TeamRow, "name" | "short_name">>;
        Relationships: [];
      };
      players: {
        Row: PlayerRow;
        Insert: Pick<PlayerRow, "team_id" | "name" | "army"> & Partial<PlayerRow>;
        Update: Partial<
          Pick<
            PlayerRow,
            | "name"
            | "army"
            | "detachment"
            | "list_name"
            | "list_content"
            | "notes"
            | "disposition"
            | "user_id"
          >
        >;
        Relationships: [];
      };
      rounds: {
        Row: RoundRow;
        Insert: Pick<RoundRow, "tournament_id" | "number" | "opponent_team_id"> &
          Partial<RoundRow>;
        Update: Partial<Pick<RoundRow, "number" | "scenario" | "status" | "opponent_team_id">>;
        Relationships: [];
      };
      estimates: {
        Row: EstimateRow;
        Insert: Pick<EstimateRow, "player_id" | "opponent_player_id" | "value"> &
          Partial<EstimateRow>;
        Update: Partial<Pick<EstimateRow, "value" | "comment">>;
        Relationships: [];
      };
      pairing_actions: {
        Row: PairingActionRow;
        Insert: Pick<
          PairingActionRow,
          "round_id" | "sequence" | "type" | "side" | "player_ids"
        > &
          Partial<PairingActionRow>;
        Update: Partial<Pick<PairingActionRow, "sequence">>;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: Pick<
          MatchRow,
          "round_id" | "our_player_id" | "opponent_player_id" | "origin" | "step_index"
        > &
          Partial<MatchRow>;
        Update: Partial<Pick<MatchRow, "table_number">>;
        Relationships: [];
      };
      army_rules: {
        Row: ArmyRuleRow;
        Insert: Pick<ArmyRuleRow, "army" | "rule"> & Partial<ArmyRuleRow>;
        Update: Partial<Pick<ArmyRuleRow, "army" | "rule">>;
        Relationships: [];
      };
      detachment_rules: {
        Row: DetachmentRuleRow;
        Insert: Pick<DetachmentRuleRow, "army" | "detachment" | "rule"> &
          Partial<DetachmentRuleRow>;
        Update: Partial<Pick<DetachmentRuleRow, "army" | "detachment" | "rule">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      team_kind: TeamKind;
      round_status: RoundStatus;
      list_disposition: Disposition;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
