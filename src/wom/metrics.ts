// Display names for WOM metrics, generated from the Wise Old Man source
// (server/src/types/metric.enum.ts + utils/shared/metric.utils.ts). This is a
// *hint* table, not the source of truth for which metrics exist: the Hiscores and
// Gains boards build their metric list from what the WOM API actually returns, so
// a new boss/raid shows up on its own with a name derived from its key (see
// metricName). Add an entry here only to fix a derived name that reads wrong.
// Kept local so we don't pull @wise-old-man/utils into the worker bundle.

export type MetricType = "skill" | "boss" | "activity" | "computed";

// A WOM metric key, exactly as it appears in the API's JSON (e.g. "zulrah").
// Deliberately a plain string: the leaderboards discover metrics from the API
// payload, so a metric WOM adds tomorrow works without touching this file.
export type Metric = string;

export interface MetricProp {
  name: string;
  type: MetricType;
}

export const METRIC_PROPS: Record<string, MetricProp> = {
  overall: { name: "Overall", type: "skill" },
  attack: { name: "Attack", type: "skill" },
  defence: { name: "Defence", type: "skill" },
  strength: { name: "Strength", type: "skill" },
  hitpoints: { name: "Hitpoints", type: "skill" },
  ranged: { name: "Ranged", type: "skill" },
  prayer: { name: "Prayer", type: "skill" },
  magic: { name: "Magic", type: "skill" },
  cooking: { name: "Cooking", type: "skill" },
  woodcutting: { name: "Woodcutting", type: "skill" },
  fletching: { name: "Fletching", type: "skill" },
  fishing: { name: "Fishing", type: "skill" },
  firemaking: { name: "Firemaking", type: "skill" },
  crafting: { name: "Crafting", type: "skill" },
  smithing: { name: "Smithing", type: "skill" },
  mining: { name: "Mining", type: "skill" },
  herblore: { name: "Herblore", type: "skill" },
  agility: { name: "Agility", type: "skill" },
  thieving: { name: "Thieving", type: "skill" },
  slayer: { name: "Slayer", type: "skill" },
  farming: { name: "Farming", type: "skill" },
  runecrafting: { name: "Runecrafting", type: "skill" },
  hunter: { name: "Hunter", type: "skill" },
  construction: { name: "Construction", type: "skill" },
  sailing: { name: "Sailing", type: "skill" },
  abyssal_sire: { name: "Abyssal Sire", type: "boss" },
  alchemical_hydra: { name: "Alchemical Hydra", type: "boss" },
  amoxliatl: { name: "Amoxliatl", type: "boss" },
  araxxor: { name: "Araxxor", type: "boss" },
  artio: { name: "Artio", type: "boss" },
  barrows_chests: { name: "Barrows Chests", type: "boss" },
  brutus: { name: "Brutus", type: "boss" },
  bryophyta: { name: "Bryophyta", type: "boss" },
  callisto: { name: "Callisto", type: "boss" },
  calvarion: { name: "Calvar'ion", type: "boss" },
  cerberus: { name: "Cerberus", type: "boss" },
  chambers_of_xeric: { name: "Chambers Of Xeric", type: "boss" },
  chambers_of_xeric_challenge_mode: { name: "Chambers Of Xeric (CM)", type: "boss" },
  chaos_elemental: { name: "Chaos Elemental", type: "boss" },
  chaos_fanatic: { name: "Chaos Fanatic", type: "boss" },
  commander_zilyana: { name: "Commander Zilyana", type: "boss" },
  corporeal_beast: { name: "Corporeal Beast", type: "boss" },
  crazy_archaeologist: { name: "Crazy Archaeologist", type: "boss" },
  dagannoth_prime: { name: "Dagannoth Prime", type: "boss" },
  dagannoth_rex: { name: "Dagannoth Rex", type: "boss" },
  dagannoth_supreme: { name: "Dagannoth Supreme", type: "boss" },
  deranged_archaeologist: { name: "Deranged Archaeologist", type: "boss" },
  doom_of_mokhaiotl: { name: "Doom of Mokhaiotl", type: "boss" },
  duke_sucellus: { name: "Duke Sucellus", type: "boss" },
  general_graardor: { name: "General Graardor", type: "boss" },
  giant_mole: { name: "Giant Mole", type: "boss" },
  grotesque_guardians: { name: "Grotesque Guardians", type: "boss" },
  hespori: { name: "Hespori", type: "boss" },
  kalphite_queen: { name: "Kalphite Queen", type: "boss" },
  king_black_dragon: { name: "King Black Dragon", type: "boss" },
  kraken: { name: "Kraken", type: "boss" },
  kreearra: { name: "Kree'Arra", type: "boss" },
  kril_tsutsaroth: { name: "K'ril Tsutsaroth", type: "boss" },
  lunar_chests: { name: "Lunar Chests", type: "boss" },
  mad_angel: { name: "Mad Angel", type: "boss" },
  maggot_king: { name: "Maggot King", type: "boss" },
  mimic: { name: "Mimic", type: "boss" },
  nex: { name: "Nex", type: "boss" },
  nightmare: { name: "Nightmare", type: "boss" },
  phosanis_nightmare: { name: "Phosani's Nightmare", type: "boss" },
  obor: { name: "Obor", type: "boss" },
  phantom_muspah: { name: "Phantom Muspah", type: "boss" },
  sarachnis: { name: "Sarachnis", type: "boss" },
  scorpia: { name: "Scorpia", type: "boss" },
  scurrius: { name: "Scurrius", type: "boss" },
  shellbane_gryphon: { name: "Shellbane Gryphon", type: "boss" },
  skotizo: { name: "Skotizo", type: "boss" },
  sol_heredit: { name: "Sol Heredit", type: "boss" },
  spindel: { name: "Spindel", type: "boss" },
  tempoross: { name: "Tempoross", type: "boss" },
  the_gauntlet: { name: "The Gauntlet", type: "boss" },
  the_corrupted_gauntlet: { name: "The Corrupted Gauntlet", type: "boss" },
  the_fractured_archive: { name: "The Fractured Archive", type: "boss" },
  the_hueycoatl: { name: "The Hueycoatl", type: "boss" },
  the_leviathan: { name: "The Leviathan", type: "boss" },
  the_royal_titans: { name: "The Royal Titans", type: "boss" },
  the_whisperer: { name: "The Whisperer", type: "boss" },
  theatre_of_blood: { name: "Theatre Of Blood", type: "boss" },
  theatre_of_blood_hard_mode: { name: "Theatre Of Blood (HM)", type: "boss" },
  thermonuclear_smoke_devil: { name: "Thermonuclear Smoke Devil", type: "boss" },
  tombs_of_amascut: { name: "Tombs of Amascut", type: "boss" },
  tombs_of_amascut_expert: { name: "Tombs of Amascut (Expert Mode)", type: "boss" },
  tzkal_zuk: { name: "TzKal-Zuk", type: "boss" },
  tztok_jad: { name: "TzTok-Jad", type: "boss" },
  vardorvis: { name: "Vardorvis", type: "boss" },
  venenatis: { name: "Venenatis", type: "boss" },
  vetion: { name: "Vet'ion", type: "boss" },
  vorkath: { name: "Vorkath", type: "boss" },
  wintertodt: { name: "Wintertodt", type: "boss" },
  yama: { name: "Yama", type: "boss" },
  zalcano: { name: "Zalcano", type: "boss" },
  zulrah: { name: "Zulrah", type: "boss" },
  bounty_hunter_hunter: { name: "Bounty Hunter (Hunter)", type: "activity" },
  bounty_hunter_rogue: { name: "Bounty Hunter (Rogue)", type: "activity" },
  clue_scrolls_all: { name: "Clue Scrolls (All)", type: "activity" },
  clue_scrolls_beginner: { name: "Clue Scrolls (Beginner)", type: "activity" },
  clue_scrolls_easy: { name: "Clue Scrolls (Easy)", type: "activity" },
  clue_scrolls_medium: { name: "Clue Scrolls (Medium)", type: "activity" },
  clue_scrolls_hard: { name: "Clue Scrolls (Hard)", type: "activity" },
  clue_scrolls_elite: { name: "Clue Scrolls (Elite)", type: "activity" },
  clue_scrolls_master: { name: "Clue Scrolls (Master)", type: "activity" },
  last_man_standing: { name: "Last Man Standing", type: "activity" },
  pvp_arena: { name: "PvP Arena", type: "activity" },
  soul_wars_zeal: { name: "Soul Wars Zeal", type: "activity" },
  guardians_of_the_rift: { name: "Guardians of the Rift", type: "activity" },
  colosseum_glory: { name: "Colosseum Glory", type: "activity" },
  collections_logged: { name: "Collection Logs", type: "activity" },
  ehp: { name: "EHP", type: "computed" },
  ehb: { name: "EHB", type: "computed" },
};

// A metric as offered in the boards' picker: key, display name, and type (for
// grouping and value formatting). Built from the API payload in leaderboards.ts.
export interface MetricOption {
  id: Metric;
  name: string;
  type: MetricType;
}

// Known display name, else derived from the key: "the_fractured_archive" ->
// "The Fractured Archive".
export function metricName(metric: Metric): string {
  return (
    METRIC_PROPS[metric]?.name ??
    metric
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}
