export type PageId =
  | "dashboard"
  | "farms"
  | "seasons"
  | "inputs"
  | "monitoring"
  | "harvests"
  | "intelligence"
  | "financial"
  | "marketplace";

export type InputType = "Seeds" | "Fertilizer" | "Crop protection";

export type SeasonStatus = "planned" | "active" | "completed" | "overdue";

export interface Farm {
  id: string;
  name: string;
  location: string;
  sizeHa: number;
  crop: string;
  createdAt: string;
  sample: boolean;
}

export interface Season {
  id: string;
  farmId: string;
  name: string;
  plantingDate: string;
  expectedHarvestDate: string;
  sample: boolean;
}

export interface InputRecord {
  id: string;
  farmId: string;
  seasonId: string | null;
  type: InputType;
  product: string;
  quantity: number;
  unit: string;
  applicationDate: string;
  supplier: string;
  costRwf?: number;
  sample: boolean;
}

export interface Observation {
  id: string;
  farmId: string;
  seasonId: string | null;
  date: string;
  notes: string;
  photoDataUrl: string;
  photoName: string;
  sample: boolean;
}

export interface Harvest {
  id: string;
  farmId: string;
  seasonId: string | null;
  date: string;
  crop: string;
  quantityKg: number;
  sample: boolean;
}

export interface EzaData {
  farms: Farm[];
  seasons: Season[];
  inputs: InputRecord[];
  observations: Observation[];
  harvests: Harvest[];
  financial?: FinancialData;
}

export type FinancialRole = "farmer" | "institution" | "buyer" | "admin";

export type FinanceApplicationStatus =
  | "submitted"
  | "under_review"
  | "needs_information"
  | "approved_demo"
  | "declined_demo";

export interface FinanceApplication {
  id: string;
  farmId: string;
  opportunityId: string;
  requestedAmountRwf: number;
  status: FinanceApplicationStatus;
  submittedAt: string;
  reportShared: boolean;
  sharedReport?: string;
  sample: boolean;
}

export type MarketListingStatus = "open" | "closed";
export type ProduceAvailability = "expected" | "available";

export interface MarketListing {
  id: string;
  farmId: string;
  seasonId: string | null;
  harvestId: string | null;
  availability: ProduceAvailability;
  crop: string;
  quantityKg: number;
  expectedHarvestDate: string;
  quality: string;
  priceRwfPerKg: number;
  minimumOrderKg: number;
  status: MarketListingStatus;
  sample: boolean;
}

export type MarketOfferStatus = "pending" | "countered" | "accepted" | "rejected";

export interface MarketOffer {
  id: string;
  listingId: string | null;
  requestId: string | null;
  farmId: string;
  buyerName: string;
  offeredBy: "buyer" | "farmer";
  quantityKg: number;
  priceRwfPerKg: number;
  deliveryRequirements: string;
  status: MarketOfferStatus;
  createdAt: string;
  sample: boolean;
}

export type ProcurementRequestStatus = "active" | "closed";

export interface ProcurementRequest {
  id: string;
  buyerName: string;
  crop: string;
  location: string;
  quantityKg: number;
  deliveryDate: string;
  deliveryRequirements: string;
  status: ProcurementRequestStatus;
  sample: boolean;
}

export interface FinancialData {
  role: FinancialRole;
  selectedFarmId: string;
  farmerName: string;
  farmerContact: string;
  applications: FinanceApplication[];
  listings: MarketListing[];
  offers: MarketOffer[];
  procurementRequests: ProcurementRequest[];
}

export interface Activity {
  id: string;
  date: string;
  farmId: string;
  farmName: string;
  title: string;
  detail: string;
  kind: "farm" | "season" | "input" | "observation" | "harvest";
}

export type InsightSeverity = "info" | "warning" | "attention";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  farmId: string;
  farmName: string;
}
