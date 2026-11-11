import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  EzaData,
  Farm,
  FinanceApplication,
  FinancialRole,
  Harvest,
  InputRecord,
  MarketListing,
  MarketOffer,
  Observation,
  ProcurementRequest,
  Season,
} from "./types";
import { EMPTY_FINANCIAL_DATA } from "./finance-model";
import { createSeedData, EMPTY_DATA } from "./seed";

const STORAGE_KEY = "eza.v1";
const LEGACY_SAMPLE_PHOTOS: Record<string, string[]> = {
  o1: ["sample-umucyo.svg"],
  o2: ["sample-umucyo-hilling.svg"],
  o3: ["sample-ingabo.svg"],
  o4: ["sample-kivu.svg", "sample-kivu.jpg"],
  o5: ["sample-huye.svg"],
  o6: ["sample-muhanga.svg"],
  o7: ["sample-gakenke.svg"],
  o8: ["sample-rwamagana.svg"],
  o9: ["sample-rubavu.svg"],
};

function loadData(): EzaData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedData();
    const parsed = JSON.parse(raw) as Partial<EzaData>;
    if (!parsed || !Array.isArray(parsed.farms)) return createSeedData();
    const sampleData = createSeedData();
    const sampleObservations = new Map(
      sampleData.observations.map((observation) => [observation.id, observation]),
    );
    const sampleFinancial = sampleData.financial ?? EMPTY_FINANCIAL_DATA;
    const financial = parsed.financial
      ? {
          ...EMPTY_FINANCIAL_DATA,
          ...parsed.financial,
          listings: (parsed.financial.listings ?? []).map((listing) =>
            listing.sample
              ? { ...listing, quality: listing.quality.replace(/^Sample listing · /i, "") }
              : listing,
          ),
          offers: (parsed.financial.offers ?? []).map((offer) =>
            offer.sample ? { ...offer, buyerName: offer.buyerName.replace(/ · demo$/i, "") } : offer,
          ),
          procurementRequests: (parsed.financial.procurementRequests ?? []).map((request) =>
            request.sample
              ? {
                  ...request,
                  buyerName: request.buyerName.replace(/ · demo$/i, ""),
                  deliveryRequirements: request.deliveryRequirements.replace(/^Sample request · /i, ""),
                }
              : request,
          ),
          selectedFarmId: parsed.farms.some(
            (farm) => farm.id === parsed.financial?.selectedFarmId,
          )
            ? parsed.financial.selectedFarmId ?? ""
            : parsed.farms[0]?.id ?? "",
        }
      : parsed.farms.some((farm) => farm.sample)
        ? {
            ...sampleFinancial,
            selectedFarmId:
              parsed.farms.find((farm) => farm.id === sampleFinancial.selectedFarmId)?.id ??
              parsed.farms[0]?.id ??
              "",
          }
        : {
            ...EMPTY_FINANCIAL_DATA,
            selectedFarmId: parsed.farms[0]?.id ?? "",
          };
    return {
      farms: parsed.farms ?? [],
      seasons: parsed.seasons ?? [],
      inputs: parsed.inputs ?? [],
      observations: (parsed.observations ?? []).map((observation) => {
        const sampleObservation = sampleObservations.get(observation.id);
        const legacyPhotoNames = LEGACY_SAMPLE_PHOTOS[observation.id];
        if (
          !observation.sample ||
          !sampleObservation ||
          !legacyPhotoNames?.includes(observation.photoName)
        ) {
          return observation;
        }
        return {
          ...observation,
          photoName: sampleObservation.photoName,
          photoDataUrl: sampleObservation.photoDataUrl,
        };
      }),
      harvests: parsed.harvests ?? [],
      financial,
    };
  } catch {
    return createSeedData();
  }
}

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) return [item, ...items];
  const next = items.slice();
  next[index] = item;
  return next;
}

interface StoreValue {
  data: EzaData;
  persistError: string | null;
  saveFarm: (farm: Farm) => void;
  deleteFarm: (id: string) => void;
  saveSeason: (season: Season) => void;
  deleteSeason: (id: string) => void;
  saveInput: (input: InputRecord) => void;
  deleteInput: (id: string) => void;
  saveObservation: (observation: Observation) => void;
  deleteObservation: (id: string) => void;
  saveHarvest: (harvest: Harvest) => void;
  deleteHarvest: (id: string) => void;
  setFinancialRole: (role: FinancialRole) => void;
  setSelectedFarmId: (farmId: string) => void;
  setFarmerProfile: (name: string, contact: string) => void;
  saveFinanceApplication: (application: FinanceApplication) => void;
  updateFinanceApplicationStatus: (id: string, status: FinanceApplication["status"]) => void;
  saveMarketListing: (listing: MarketListing) => void;
  deleteMarketListing: (id: string) => void;
  saveMarketOffer: (offer: MarketOffer) => void;
  saveProcurementRequest: (request: ProcurementRequest) => void;
  updateProcurementRequestStatus: (id: string, status: ProcurementRequest["status"]) => void;
  restoreSample: () => void;
  clearAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<EzaData>(() => loadData());
  const [persistError, setPersistError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setPersistError(null);
    } catch {
      setPersistError(
        "The latest change could not be saved on this device. Remove an older photograph or use a smaller image, then try again.",
      );
    }
  }, [data]);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      persistError,
      saveFarm: (farm) => setData((current) => ({ ...current, farms: upsert(current.farms, farm) })),
      deleteFarm: (id) =>
        setData((current) => ({
          ...current,
          farms: current.farms.filter((farm) => farm.id !== id),
          seasons: current.seasons.filter((season) => season.farmId !== id),
          inputs: current.inputs.filter((input) => input.farmId !== id),
          observations: current.observations.filter((observation) => observation.farmId !== id),
          harvests: current.harvests.filter((harvest) => harvest.farmId !== id),
          financial: {
            ...(current.financial ?? EMPTY_FINANCIAL_DATA),
            selectedFarmId:
              current.financial?.selectedFarmId === id
                ? current.farms.find((farm) => farm.id !== id)?.id ?? ""
                : current.financial?.selectedFarmId ?? "",
            applications: (current.financial?.applications ?? []).filter((item) => item.farmId !== id),
            listings: (current.financial?.listings ?? []).filter((item) => item.farmId !== id),
            offers: (current.financial?.offers ?? []).filter((item) => item.farmId !== id),
          },
        })),
      saveSeason: (season) =>
        setData((current) => ({ ...current, seasons: upsert(current.seasons, season) })),
      deleteSeason: (id) =>
        setData((current) => ({
          ...current,
          seasons: current.seasons.filter((season) => season.id !== id),
          inputs: current.inputs.map((input) =>
            input.seasonId === id ? { ...input, seasonId: null } : input,
          ),
          observations: current.observations.map((observation) =>
            observation.seasonId === id ? { ...observation, seasonId: null } : observation,
          ),
          harvests: current.harvests.map((harvest) =>
            harvest.seasonId === id ? { ...harvest, seasonId: null } : harvest,
          ),
        })),
      saveInput: (input) =>
        setData((current) => ({ ...current, inputs: upsert(current.inputs, input) })),
      deleteInput: (id) =>
        setData((current) => ({
          ...current,
          inputs: current.inputs.filter((input) => input.id !== id),
        })),
      saveObservation: (observation) =>
        setData((current) => ({
          ...current,
          observations: upsert(current.observations, observation),
        })),
      deleteObservation: (id) =>
        setData((current) => ({
          ...current,
          observations: current.observations.filter((observation) => observation.id !== id),
        })),
      saveHarvest: (harvest) =>
        setData((current) => ({ ...current, harvests: upsert(current.harvests, harvest) })),
      deleteHarvest: (id) =>
        setData((current) => ({
          ...current,
          harvests: current.harvests.filter((harvest) => harvest.id !== id),
        })),
      setFinancialRole: (role) =>
        setData((current) => ({
          ...current,
          financial: { ...(current.financial ?? EMPTY_FINANCIAL_DATA), role },
        })),
      setSelectedFarmId: (selectedFarmId) =>
        setData((current) => ({
          ...current,
          financial: { ...(current.financial ?? EMPTY_FINANCIAL_DATA), selectedFarmId },
        })),
      setFarmerProfile: (farmerName, farmerContact) =>
        setData((current) => ({
          ...current,
          financial: { ...(current.financial ?? EMPTY_FINANCIAL_DATA), farmerName, farmerContact },
        })),
      saveFinanceApplication: (application) =>
        setData((current) => ({
          ...current,
          financial: {
            ...(current.financial ?? EMPTY_FINANCIAL_DATA),
            applications: upsert(current.financial?.applications ?? [], application),
          },
        })),
      updateFinanceApplicationStatus: (id, status) =>
        setData((current) => ({
          ...current,
          financial: {
            ...(current.financial ?? EMPTY_FINANCIAL_DATA),
            applications: (current.financial?.applications ?? []).map((application) =>
              application.id === id ? { ...application, status } : application,
            ),
          },
        })),
      saveMarketListing: (listing) =>
        setData((current) => ({
          ...current,
          financial: {
            ...(current.financial ?? EMPTY_FINANCIAL_DATA),
            listings: upsert(current.financial?.listings ?? [], listing),
          },
        })),
      deleteMarketListing: (id) =>
        setData((current) => ({
          ...current,
          financial: {
            ...(current.financial ?? EMPTY_FINANCIAL_DATA),
            listings: (current.financial?.listings ?? []).filter((listing) => listing.id !== id),
            offers: (current.financial?.offers ?? []).filter((offer) => offer.listingId !== id),
          },
        })),
      saveMarketOffer: (offer) =>
        setData((current) => ({
          ...current,
          financial: {
            ...(current.financial ?? EMPTY_FINANCIAL_DATA),
            offers: upsert(current.financial?.offers ?? [], offer),
          },
        })),
      saveProcurementRequest: (request) =>
        setData((current) => ({
          ...current,
          financial: {
            ...(current.financial ?? EMPTY_FINANCIAL_DATA),
            procurementRequests: upsert(current.financial?.procurementRequests ?? [], request),
          },
        })),
      updateProcurementRequestStatus: (id, status) =>
        setData((current) => ({
          ...current,
          financial: {
            ...(current.financial ?? EMPTY_FINANCIAL_DATA),
            procurementRequests: (current.financial?.procurementRequests ?? []).map((request) =>
              request.id === id ? { ...request, status } : request,
            ),
          },
        })),
      restoreSample: () => setData(createSeedData()),
      clearAll: () => setData({ ...EMPTY_DATA, financial: EMPTY_FINANCIAL_DATA }),
    }),
    [data, persistError],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
