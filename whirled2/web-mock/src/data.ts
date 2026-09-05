/**
 * Shared field shapes for optional Vite/TS experiments.
 * Live chrome uses app.js + localStorage — keep these lists EMPTY (no fake people/items).
 */

export type TabId = "me" | "stuff" | "games" | "rooms" | "groups" | "shop";
export type ItemKind = "avatar" | "furniture" | "backdrop" | "toy" | "tune" | "game";

export interface Person {
  id: string;
  name: string;
  initials: string;
  online: boolean;
  room: string;
  you?: boolean;
}

export interface RoomCard {
  id: string;
  name: string;
  owner: string;
  lock: "open" | "friends" | "private";
  occupants: number;
  note: string;
}

export interface CatalogItem {
  id: string;
  kind: ItemKind;
  name: string;
  creator: string;
  coins: number;
  owned: boolean;
}

export interface FeedEvent {
  id: string;
  who: string;
  text: string;
  place: string;
  ago: string;
}

/** Empty on purpose — populate from auth/session at runtime, never hardcoded NPCs. */
export const YOU: Person | null = null;
export const PEOPLE: Person[] = [];
export const ROOMS: RoomCard[] = [];
export const STUFF: CatalogItem[] = [];
export const SHOP: CatalogItem[] = [];
export const GAMES: { id: string; name: string; blurb: string }[] = [];
export const GROUPS: { id: string; name: string; members: number; room: string }[] = [];
export const FEED: FeedEvent[] = [];
