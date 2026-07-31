// Auto-generated from the Wise Old Man source (server/src/types/metric.enum.ts +
// utils/shared/metric.utils.ts) at integration time. Static reference data — the
// full OSRS metric catalog (skills, bosses, activities, computed). If OSRS adds
// content and WOM adds metrics, regenerate/extend this map. Kept local so we
// don't pull the whole @wise-old-man/utils package into the worker bundle.

export type MetricType = "skill" | "boss" | "activity" | "computed";

// Every metric the WOM API can key on. Values match the API's JSON keys exactly.
export type Metric =
  | "overall"
  | "attack"
  | "defence"
  | "strength"
  | "hitpoints"
  | "ranged"
  | "prayer"
  | "magic"
  | "cooking"
  | "woodcutting"
  | "fletching"
  | "fishing"
  | "firemaking"
  | "crafting"
  | "smithing"
  | "mining"
  | "herblore"
  | "agility"
  | "thieving"
  | "slayer"
  | "farming"
  | "runecrafting"
  | "hunter"
  | "construction"
  | "sailing"
  | "abyssal_sire"
  | "alchemical_hydra"
  | "amoxliatl"
  | "araxxor"
  | "artio"
  | "barrows_chests"
  | "brutus"
  | "bryophyta"
  | "callisto"
  | "calvarion"
  | "cerberus"
  | "chambers_of_xeric"
  | "chambers_of_xeric_challenge_mode"
  | "chaos_elemental"
  | "chaos_fanatic"
  | "commander_zilyana"
  | "corporeal_beast"
  | "crazy_archaeologist"
  | "dagannoth_prime"
  | "dagannoth_rex"
  | "dagannoth_supreme"
  | "deranged_archaeologist"
  | "doom_of_mokhaiotl"
  | "duke_sucellus"
  | "general_graardor"
  | "giant_mole"
  | "grotesque_guardians"
  | "hespori"
  | "kalphite_queen"
  | "king_black_dragon"
  | "kraken"
  | "kreearra"
  | "kril_tsutsaroth"
  | "lunar_chests"
  | "mad_angel"
  | "maggot_king"
  | "mimic"
  | "nex"
  | "nightmare"
  | "phosanis_nightmare"
  | "obor"
  | "phantom_muspah"
  | "sarachnis"
  | "scorpia"
  | "scurrius"
  | "shellbane_gryphon"
  | "skotizo"
  | "sol_heredit"
  | "spindel"
  | "tempoross"
  | "the_gauntlet"
  | "the_corrupted_gauntlet"
  | "the_hueycoatl"
  | "the_leviathan"
  | "the_royal_titans"
  | "the_whisperer"
  | "theatre_of_blood"
  | "theatre_of_blood_hard_mode"
  | "thermonuclear_smoke_devil"
  | "tombs_of_amascut"
  | "tombs_of_amascut_expert"
  | "tzkal_zuk"
  | "tztok_jad"
  | "vardorvis"
  | "venenatis"
  | "vetion"
  | "vorkath"
  | "wintertodt"
  | "yama"
  | "zalcano"
  | "zulrah"
  | "bounty_hunter_hunter"
  | "bounty_hunter_rogue"
  | "clue_scrolls_all"
  | "clue_scrolls_beginner"
  | "clue_scrolls_easy"
  | "clue_scrolls_medium"
  | "clue_scrolls_hard"
  | "clue_scrolls_elite"
  | "clue_scrolls_master"
  | "last_man_standing"
  | "pvp_arena"
  | "soul_wars_zeal"
  | "guardians_of_the_rift"
  | "colosseum_glory"
  | "collections_logged"
  | "ehp"
  | "ehb";

export interface MetricProp {
  name: string;
  type: MetricType;
}

export const METRIC_PROPS: Record<Metric, MetricProp> = {
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

export const ALL_METRICS = Object.keys(METRIC_PROPS) as Metric[];

// Metrics grouped by type, for building grouped <select> options in the UI.
export const METRICS_BY_TYPE: Record<MetricType, Metric[]> = {
  skill: ALL_METRICS.filter((m) => METRIC_PROPS[m].type === "skill"),
  boss: ALL_METRICS.filter((m) => METRIC_PROPS[m].type === "boss"),
  activity: ALL_METRICS.filter((m) => METRIC_PROPS[m].type === "activity"),
  computed: ALL_METRICS.filter((m) => METRIC_PROPS[m].type === "computed"),
};

export function metricName(metric: string): string {
  return METRIC_PROPS[metric as Metric]?.name ?? metric;
}

export function isMetric(value: string): value is Metric {
  return value in METRIC_PROPS;
}
