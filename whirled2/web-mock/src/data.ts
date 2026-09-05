/**
 * Mock catalog + people. Fake data, real field shapes.
 * A later API can return the same fields. Do not add Pixi objects here.
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

export const YOU: Person = {
  id: "josh",
  name: "Josh",
  initials: "J",
  online: true,
  room: "Studio Loft",
  you: true
};

export const PEOPLE: Person[] = [
  YOU,
  { id: "brittney", name: "Brittney", initials: "B", online: true, room: "Studio Loft" },
  { id: "vortex", name: "Agent Vortex", initials: "AV", online: true, room: "Studio Loft" },
  { id: "pletou", name: "Pletou", initials: "P", online: true, room: "Secret Glade" },
  { id: "cleaver", name: "Cleaver", initials: "C", online: false, room: "Bang Heroes" }
];

export const ROOMS: RoomCard[] = [
  { id: "loft", name: "Studio Loft", owner: "Josh", lock: "open", occupants: 3, note: "Home room. Engine mounts here." },
  { id: "glade", name: "Secret Glade", owner: "Brittney", lock: "open", occupants: 1, note: "Night backdrop, two moons." },
  { id: "stage", name: "Brave New Whirled", owner: "Group", lock: "friends", occupants: 8, note: "Public lobby from the old world." },
  { id: "bella", name: "Bella Living Room", owner: "Club Bella", lock: "open", occupants: 2, note: "Group whirled example." }
];

export const STUFF: CatalogItem[] = [
  { id: "s1", kind: "avatar", name: "Inkcoat Josh", creator: "Josh", coins: 0, owned: true },
  { id: "s2", kind: "avatar", name: "Tofu (default)", creator: "system", coins: 0, owned: true },
  { id: "s3", kind: "furniture", name: "Oak table", creator: "Brittney", coins: 40, owned: true },
  { id: "s4", kind: "furniture", name: "Reading lamp", creator: "Cleaver", coins: 25, owned: true },
  { id: "s5", kind: "backdrop", name: "Cream loft wall", creator: "Josh", coins: 0, owned: true },
  { id: "s6", kind: "tune", name: "Loft afternoon", creator: "Pletou", coins: 15, owned: true }
];

export const SHOP: CatalogItem[] = [
  { id: "p1", kind: "avatar", name: "Paper fox", creator: "Pletou", coins: 80, owned: false },
  { id: "p2", kind: "furniture", name: "Window seat", creator: "Brittney", coins: 60, owned: false },
  { id: "p3", kind: "backdrop", name: "Two-moon night", creator: "Vortex", coins: 120, owned: false },
  { id: "p4", kind: "toy", name: "Click-plant", creator: "Cleaver", coins: 20, owned: false },
  { id: "p5", kind: "tune", name: "Parlor loop", creator: "Pletou", coins: 35, owned: false },
  { id: "p6", kind: "game", name: "Table checkers", creator: "Group", coins: 50, owned: false },
  { id: "p7", kind: "furniture", name: "Green door", creator: "Brittney", coins: 45, owned: false },
  { id: "p8", kind: "avatar", name: "Editorial dummy", creator: "Josh", coins: 10, owned: false }
];

export const GAMES = [
  { id: "g1", name: "Table checkers", blurb: "Sits on a room table. Layer 3 in PITCH.md." },
  { id: "g2", name: "Word race", blurb: "Original Whirled dropped Flash games in rooms." },
  { id: "g3", name: "Balloon pop", blurb: "Not this cycle. Chrome only." }
];

export const GROUPS = [
  { id: "gr1", name: "Studio Loft regulars", members: 12, room: "Studio Loft" },
  { id: "gr2", name: "Wiki editors", members: 6, room: "Editor Hub" },
  { id: "gr3", name: "Club Bella", members: 40, room: "Bella Living Room" }
];

export const FEED: FeedEvent[] = [
  { id: "f1", who: "Brittney", text: "walked into Studio Loft", place: "room", ago: "2m" },
  { id: "f2", who: "Josh", text: "is wiring the page around an empty stage", place: "status", ago: "18m" },
  { id: "f3", who: "Agent Vortex", text: "commented: needs a plant", place: "comments", ago: "1h" },
  { id: "f4", who: "Pletou", text: "listed Paper fox in the shop", place: "shop", ago: "3h" }
];
