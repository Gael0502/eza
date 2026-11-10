import type {
  EzaData,
  FinanceApplication,
  FinancialData,
  Farm,
  MarketListing,
  ProcurementRequest,
} from "./types";
import { formatDate, formatNumber, uid } from "./model";

export const FINANCING_OPPORTUNITIES = [
  {
    id: "demo-input-loan",
    institution: "Example community SACCO",
    type: "Seasonal input loan",
    minimumRwf: 100_000,
    maximumRwf: 2_000_000,
    requirements: ["Farm and crop records", "Season plan", "Input or harvest history"],
    sample: true,
  },
  {
    id: "demo-equipment",
    institution: "Example agricultural finance provider",
    type: "Equipment finance",
    minimumRwf: 500_000,
    maximumRwf: 8_000_000,
    requirements: ["Registered farm", "Equipment quotation", "Production records"],
    sample: true,
  },
  {
    id: "demo-working-capital",
    institution: "Example cooperative finance fund",
    type: "Harvest working capital",
    minimumRwf: 250_000,
    maximumRwf: 5_000_000,
    requirements: ["Expected harvest", "Buyer or cooperative plan", "Season history"],
    sample: true,
  },
] as const;

export const EMPTY_FINANCIAL_DATA: FinancialData = {
  role: "farmer",
  selectedFarmId: "",
  farmerName: "",
  farmerContact: "",
  applications: [],
  listings: [],
  offers: [],
  procurementRequests: [],
};

export function selectedFarm(data: EzaData): Farm | undefined {
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  return data.farms.find((farm) => farm.id === financial.selectedFarmId) ?? data.farms[0];
}

export function acceptedListingQuantity(financial: FinancialData, listingId: string): number {
  return financial.offers
    .filter((offer) => offer.listingId === listingId && offer.status === "accepted")
    .reduce((sum, offer) => sum + offer.quantityKg, 0);
}

export function remainingListingQuantity(financial: FinancialData, listing: MarketListing): number {
  return Math.max(0, listing.quantityKg - acceptedListingQuantity(financial, listing.id));
}

export function activeRequestQuantity(
  financial: FinancialData,
  request: ProcurementRequest,
): number {
  return financial.offers
    .filter(
      (offer) =>
        offer.requestId === request.id &&
        (offer.status === "pending" || offer.status === "countered" || offer.status === "accepted"),
    )
    .reduce((sum, offer) => sum + offer.quantityKg, 0);
}

export function knownInputExpenditure(data: EzaData, farmId: string): number {
  return data.inputs
    .filter((input) => input.farmId === farmId && input.costRwf !== undefined)
    .reduce((sum, input) => sum + (input.costRwf ?? 0), 0);
}

export function financingReadiness(data: EzaData, farm: Farm) {
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const farmInputs = data.inputs.filter((item) => item.farmId === farm.id);
  const farmSeasons = data.seasons.filter((item) => item.farmId === farm.id);
  const checks = [
    { label: "Farm identity and location", complete: Boolean(farm.name && farm.location) },
    { label: "Recorded farm area and crop", complete: farm.sizeHa > 0 && Boolean(farm.crop) },
    { label: "Season planting and harvest dates", complete: farmSeasons.length > 0 },
    { label: "Input application history", complete: farmInputs.length > 0 },
    {
      label: "Input costs",
      complete: farmInputs.some((input) => input.costRwf !== undefined),
    },
    {
      label: "Field observations",
      complete: data.observations.some((item) => item.farmId === farm.id),
    },
    {
      label: "Recorded harvest history",
      complete: data.harvests.some((item) => item.farmId === farm.id),
    },
    {
      label: "Farmer-provided expected quantity and price",
      complete: financial.listings.some(
        (item) => item.farmId === farm.id && item.availability === "expected" && item.status === "open",
      ),
    },
    {
      label: "Farmer name and contact details",
      complete: Boolean(financial.farmerName?.trim() && financial.farmerContact?.trim()),
    },
  ];
  const complete = checks.filter((check) => check.complete).length;
  return { checks, complete, total: checks.length, percent: Math.round((complete / checks.length) * 100) };
}

export function estimatedListingRevenue(financial: FinancialData, farmId?: string): number {
  return financial.listings
    .filter(
      (listing) =>
        listing.status === "open" &&
        listing.availability === "expected" &&
        (!farmId || listing.farmId === farmId),
    )
    .reduce((sum, listing) => sum + listing.quantityKg * listing.priceRwfPerKg, 0);
}

export function buildFarmerReport(data: EzaData, farm: Farm): string {
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const seasons = data.seasons.filter((season) => season.farmId === farm.id);
  const inputs = data.inputs.filter((input) => input.farmId === farm.id);
  const harvests = data.harvests.filter((harvest) => harvest.farmId === farm.id);
  const listings = financial.listings.filter((listing) => listing.farmId === farm.id && listing.status === "open");
  const knownCosts = inputs.filter((input) => input.costRwf !== undefined);
  const lines = [
    "EZA FARM PERFORMANCE REPORT",
    "Prepared from records saved on this device. Example records are marked in EZA.",
    `Generated: ${formatDate(new Date().toISOString().slice(0, 10))}`,
    "",
    "FARM PROFILE",
    `Farm/cooperative: ${farm.name}`,
    `Farmer/contact: ${financial.farmerName || "Not provided"} · ${financial.farmerContact || "Not provided"}`,
    `Location: ${farm.location}`,
    `Area: ${formatNumber(farm.sizeHa, 1)} ha`,
    `Main crop: ${farm.crop}`,
    `Farm records saved on this device: ${data.farms.length}`,
    "",
    "PRODUCTION",
    `Growing seasons: ${seasons.length}`,
    ...seasons.map((season) => `- ${season.name}: planted ${formatDate(season.plantingDate)}, expected ${formatDate(season.expectedHarvestDate)}`),
    `Recorded harvests: ${harvests.length}`,
    ...harvests.map((harvest) => `- ${formatDate(harvest.date)} · ${harvest.crop} · ${formatNumber(harvest.quantityKg)} kg`),
    "",
    "INPUTS",
    `Input records: ${inputs.length}`,
    `Input records with farmer-entered cost: ${knownCosts.length} of ${inputs.length}`,
    `Known recorded input expenditure: ${formatNumber(knownInputExpenditure(data, farm.id))} RWF`,
    ...inputs.map(
      (input) =>
        `- ${formatDate(input.applicationDate)} · ${input.type} · ${input.product} · ${formatNumber(input.quantity)} ${input.unit}${input.costRwf === undefined ? " · cost not recorded" : ` · ${formatNumber(input.costRwf)} RWF`}`,
    ),
    "",
    "EXPECTED MARKET LISTINGS",
    ...listings.map(
      (listing) =>
        `- ${listing.crop} · ${formatNumber(listing.quantityKg)} kg · expected ${formatDate(listing.expectedHarvestDate)} · proposed ${formatNumber(listing.priceRwfPerKg)} RWF/kg · estimated ${formatNumber(listing.quantityKg * listing.priceRwfPerKg)} RWF`,
    ),
    `Estimated listed sales value at farmer-proposed prices: ${formatNumber(estimatedListingRevenue(financial, farm.id))} RWF`,
    "",
    "Estimated sales values use farmer-entered proposed prices and quantities. They are not guaranteed revenue, a valuation, a credit decision, or financial advice.",
    "This report contains only the farm profile shown above. Including it with an application requires a separate, explicit opt-in. The report is saved on this device and is not sent automatically.",
  ];
  return lines.join("\r\n");
}

export function newFinanceApplication(
  farmId: string,
  opportunityId: string,
  requestedAmountRwf: number,
  reportShared: boolean,
  sharedReport?: string,
  sample = false,
): FinanceApplication {
  return {
    id: uid(),
    farmId,
    opportunityId,
    requestedAmountRwf,
    status: "submitted",
    submittedAt: new Date().toISOString().slice(0, 10),
    reportShared,
    sharedReport: reportShared ? sharedReport : undefined,
    sample,
  };
}

export function statusLabel(status: string): string {
  if (status === "submitted") return "Saved locally";
  if (status === "under_review") return "Under review (recorded here)";
  if (status === "needs_information") return "More information requested (recorded here)";
  if (status === "approved_demo") return "Approved (recorded here)";
  if (status === "declined_demo") return "Declined (recorded here)";
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function estimatedSupplyByCrop(financial: FinancialData): Map<string, number> {
  const totals = new Map<string, number>();
  for (const listing of financial.listings) {
    if (listing.availability !== "expected" || listing.status !== "open") continue;
    totals.set(listing.crop, (totals.get(listing.crop) ?? 0) + listing.quantityKg);
  }
  return totals;
}

export function sampleRequestMatches(request: ProcurementRequest, crop: string): boolean {
  return request.status === "active" && request.crop === crop;
}
