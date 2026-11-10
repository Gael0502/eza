import type {
  Activity,
  EzaData,
  Farm,
  Harvest,
  Insight,
  Season,
  SeasonStatus,
} from "./types";

export const CROPS = [
  "Maize",
  "Beans",
  "Irish potato",
  "Rice",
  "Coffee",
  "Tea",
  "Cassava",
  "Banana",
  "Sorghum",
  "Wheat",
  "Vegetables",
  "Soybean",
] as const;

export const DISTRICTS = [
  "Bugesera",
  "Burera",
  "Gakenke",
  "Gatsibo",
  "Gisagara",
  "Huye",
  "Kamonyi",
  "Karongi",
  "Kayonza",
  "Kigali",
  "Muhanga",
  "Musanze",
  "Ngoma",
  "Ngororero",
  "Nyagatare",
  "Nyamasheke",
  "Nyanza",
  "Rubavu",
  "Ruhango",
  "Rulindo",
  "Rusizi",
  "Rwamagana",
] as const;

export const INPUT_TYPES = ["Seeds", "Fertilizer", "Crop protection"] as const;

export const INPUT_UNITS = ["kg", "g", "L", "mL", "bags"] as const;

/** Non-official reference yields used for contextual comparisons, not targets. */
const YIELD_BENCHMARK_KG_HA: Record<string, number> = {
  Maize: 2500,
  Beans: 800,
  "Irish potato": 12000,
  Rice: 3500,
  Coffee: 1200,
  Tea: 1800,
  Cassava: 8000,
  Banana: 8000,
  Sorghum: 1200,
  Wheat: 2000,
  Vegetables: 8000,
  Soybean: 1000,
};

export function todayISO(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function daysBetween(from: string, to: string): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDate(value: string): string {
  return parseISODate(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function farmById(data: EzaData, id: string): Farm | undefined {
  return data.farms.find((farm) => farm.id === id);
}

export function seasonById(data: EzaData, id: string | null): Season | undefined {
  if (!id) return undefined;
  return data.seasons.find((season) => season.id === id);
}

export function harvestsForSeason(data: EzaData, seasonId: string): Harvest[] {
  return data.harvests.filter((harvest) => harvest.seasonId === seasonId);
}

export function seasonStatus(data: EzaData, season: Season, today = todayISO()): SeasonStatus {
  if (harvestsForSeason(data, season.id).length > 0) return "completed";
  if (today < season.plantingDate) return "planned";
  if (today > season.expectedHarvestDate) return "overdue";
  return "active";
}

export function seasonProgress(data: EzaData, season: Season, today = todayISO()): number {
  const status = seasonStatus(data, season, today);
  if (status === "planned") return 0;
  if (status === "completed") return 100;
  const total = Math.max(1, daysBetween(season.plantingDate, season.expectedHarvestDate));
  const elapsed = daysBetween(season.plantingDate, today);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function statusLabel(status: SeasonStatus): string {
  switch (status) {
    case "planned":
      return "Planned";
    case "active":
      return "Active";
    case "completed":
      return "Harvested";
    case "overdue":
      return "Harvest due";
  }
}

export function activeSeasonCount(data: EzaData, today = todayISO()): number {
  return data.seasons.filter((season) => seasonStatus(data, season, today) === "active").length;
}

export function totalHarvestKg(data: EzaData): number {
  return data.harvests.reduce((sum, harvest) => sum + harvest.quantityKg, 0);
}

export interface CropPerformance {
  crop: string;
  quantityKg: number;
  records: number;
}

export function cropPerformance(data: EzaData): CropPerformance[] {
  const map = new Map<string, CropPerformance>();
  for (const harvest of data.harvests) {
    const current = map.get(harvest.crop) ?? {
      crop: harvest.crop,
      quantityKg: 0,
      records: 0,
    };
    current.quantityKg += harvest.quantityKg;
    current.records += 1;
    map.set(harvest.crop, current);
  }
  return [...map.values()].sort((a, b) => b.quantityKg - a.quantityKg);
}

export function yieldKgHa(data: EzaData, harvest: Harvest): number | null {
  const farm = farmById(data, harvest.farmId);
  if (!farm || farm.sizeHa <= 0) return null;
  return harvest.quantityKg / farm.sizeHa;
}

export function activities(data: EzaData): Activity[] {
  const items: Activity[] = [];

  for (const farm of data.farms) {
    items.push({
      id: `farm-${farm.id}`,
      date: farm.createdAt,
      farmId: farm.id,
      farmName: farm.name,
      title: "Farm registered",
      detail: `${farm.crop} · ${farm.location} · ${formatNumber(farm.sizeHa, 1)} ha`,
      kind: "farm",
    });
  }

  for (const season of data.seasons) {
    const farm = farmById(data, season.farmId);
    items.push({
      id: `season-${season.id}`,
      date: season.plantingDate,
      farmId: season.farmId,
      farmName: farm?.name ?? "Unknown farm",
      title: `Season started · ${season.name}`,
      detail: `Planted ${formatDate(season.plantingDate)} · expected harvest ${formatDate(season.expectedHarvestDate)}`,
      kind: "season",
    });
  }

  for (const input of data.inputs) {
    const farm = farmById(data, input.farmId);
    items.push({
      id: `input-${input.id}`,
      date: input.applicationDate,
      farmId: input.farmId,
      farmName: farm?.name ?? "Unknown farm",
      title: `${input.type} applied`,
      detail: `${input.product} · ${formatNumber(input.quantity, input.quantity % 1 ? 1 : 0)} ${input.unit} · ${input.supplier}`,
      kind: "input",
    });
  }

  for (const observation of data.observations) {
    const farm = farmById(data, observation.farmId);
    items.push({
      id: `obs-${observation.id}`,
      date: observation.date,
      farmId: observation.farmId,
      farmName: farm?.name ?? "Unknown farm",
      title: "Crop observation",
      detail: observation.notes,
      kind: "observation",
    });
  }

  for (const harvest of data.harvests) {
    const farm = farmById(data, harvest.farmId);
    items.push({
      id: `harvest-${harvest.id}`,
      date: harvest.date,
      farmId: harvest.farmId,
      farmName: farm?.name ?? "Unknown farm",
      title: `${harvest.crop} harvested`,
      detail: `${formatNumber(harvest.quantityKg)} kg recorded`,
      kind: "harvest",
    });
  }

  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function latestDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

export function buildInsights(data: EzaData, today = todayISO()): Insight[] {
  const insights: Insight[] = [];

  for (const season of data.seasons) {
    const farm = farmById(data, season.farmId);
    if (!farm) continue;
    const status = seasonStatus(data, season, today);
    const daysToHarvest = daysBetween(today, season.expectedHarvestDate);

    if (status === "active" && daysToHarvest >= 0 && daysToHarvest <= 14) {
      insights.push({
        id: `upcoming-${season.id}`,
        severity: "info",
        title: "Upcoming harvest",
        detail: `${season.name} at ${farm.name} is expected around ${formatDate(season.expectedHarvestDate)} (${daysToHarvest === 0 ? "today" : `in ${daysToHarvest} day${daysToHarvest === 1 ? "" : "s"}`}). No harvest quantity has been recorded for this season yet.`,
        farmId: farm.id,
        farmName: farm.name,
      });
    }

    if (status === "overdue") {
      const late = daysBetween(season.expectedHarvestDate, today);
      insights.push({
        id: `overdue-harvest-${season.id}`,
        severity: "attention",
        title: "Overdue harvest record",
        detail: `${season.name} at ${farm.name} was expected by ${formatDate(season.expectedHarvestDate)}, ${late} day${late === 1 ? "" : "s"} ago. Record the harvest or update the expected date.`,
        farmId: farm.id,
        farmName: farm.name,
      });
    }

    if (status === "active") {
      const notes = data.observations.filter(
        (observation) => observation.farmId === farm.id && observation.seasonId === season.id,
      );
      const farmNotes = notes.length
        ? notes
        : data.observations.filter((observation) => observation.farmId === farm.id);
      const lastNote = latestDate(farmNotes.map((observation) => observation.date));
      const stale = !lastNote || daysBetween(lastNote, today) > 21;
      if (stale && daysBetween(season.plantingDate, today) >= 14) {
        insights.push({
          id: `missing-update-${season.id}`,
          severity: "warning",
          title: "Missing farm update",
          detail: lastNote
            ? `${farm.name} has an active season, and the latest observation is ${formatDate(lastNote)}. A field note or photograph would bring the record up to date.`
            : `${farm.name} has an active season and no crop observation on file.`,
          farmId: farm.id,
          farmName: farm.name,
        });
      }

      const seasonInputs = data.inputs.filter((input) => input.farmId === farm.id);
      const lastInput = latestDate(seasonInputs.map((input) => input.applicationDate));
      if (
        seasonInputs.length > 0 &&
        lastInput &&
        daysBetween(lastInput, today) > 45 &&
        daysBetween(season.plantingDate, today) > 30
      ) {
        insights.push({
          id: `overdue-input-${season.id}`,
          severity: "warning",
          title: "Overdue input activity",
          detail: `The latest recorded input at ${farm.name} was ${formatDate(lastInput)}. Check whether fertilizer or crop protection for ${season.name} still needs to be logged.`,
          farmId: farm.id,
          farmName: farm.name,
        });
      }
    }
  }

  for (const farm of data.farms) {
    const hasSeason = data.seasons.some((season) => season.farmId === farm.id);
    const hasInput = data.inputs.some((input) => input.farmId === farm.id);
    if (hasSeason && !hasInput) {
      insights.push({
        id: `no-inputs-${farm.id}`,
        severity: "warning",
        title: "No inputs recorded",
        detail: `${farm.name} has a growing season but no seeds, fertilizer, or crop protection products on file.`,
        farmId: farm.id,
        farmName: farm.name,
      });
    }
  }

  for (const harvest of data.harvests) {
    const farm = farmById(data, harvest.farmId);
    if (!farm) continue;
    const benchmark = YIELD_BENCHMARK_KG_HA[harvest.crop];
    const actual = yieldKgHa(data, harvest);
    if (!benchmark || actual === null) continue;
    if (actual < benchmark * 0.6) {
      insights.push({
        id: `yield-${harvest.id}`,
        severity: "attention",
        title: "Yield below reference range",
        detail: `${farm.name} recorded ${formatNumber(actual)} kg/ha of ${harvest.crop}. The non-official reference range used for comparison is about ${formatNumber(benchmark)} kg/ha. This is not an official target.`,
        farmId: farm.id,
        farmName: farm.name,
      });
    }
  }

  const rank: Record<Insight["severity"], number> = {
    attention: 0,
    warning: 1,
    info: 2,
  };
  return insights.sort((a, b) => rank[a.severity] - rank[b.severity] || a.farmName.localeCompare(b.farmName));
}

export function hasSampleData(data: EzaData): boolean {
  return (
    data.farms.some((item) => item.sample) ||
    data.seasons.some((item) => item.sample) ||
    data.inputs.some((item) => item.sample) ||
    data.observations.some((item) => item.sample) ||
    data.harvests.some((item) => item.sample)
  );
}

export function isEmpty(data: EzaData): boolean {
  return (
    data.farms.length === 0 &&
    data.seasons.length === 0 &&
    data.inputs.length === 0 &&
    data.observations.length === 0 &&
    data.harvests.length === 0
  );
}
