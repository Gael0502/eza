import { Handshake, MapPin, Plus, ShoppingBasket, Wheat } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  SampleBadge,
  SelectField,
  TextAreaField,
  TextField,
} from "../../components";
import { LiveCropImage } from "../../components/LiveCropImage";
import {
  acceptedListingQuantity,
  EMPTY_FINANCIAL_DATA,
  remainingListingQuantity,
  selectedFarm,
  statusLabel,
} from "../../finance-model";
import { CROPS, formatDate, formatNumber, todayISO, uid } from "../../model";
import { useStore } from "../../store";
import type {
  FinancialRole,
  MarketListing,
  MarketOffer,
  ProduceAvailability,
  ProcurementRequest,
} from "../../types";

interface ListingForm {
  farmId: string;
  availability: ProduceAvailability;
  seasonId: string;
  harvestId: string;
  crop: string;
  quantityKg: string;
  harvestDate: string;
  quality: string;
  priceRwfPerKg: string;
  minimumOrderKg: string;
  publish: boolean;
}

interface OfferForm {
  buyerName: string;
  quantityKg: string;
  priceRwfPerKg: string;
  deliveryRequirements: string;
}

interface RequestForm {
  buyerName: string;
  crop: string;
  location: string;
  quantityKg: string;
  deliveryDate: string;
  deliveryRequirements: string;
}

const emptyListing: ListingForm = {
  farmId: "",
  availability: "expected",
  seasonId: "",
  harvestId: "",
  crop: "Maize",
  quantityKg: "",
  harvestDate: "",
  quality: "",
  priceRwfPerKg: "",
  minimumOrderKg: "",
  publish: false,
};

const emptyOffer: OfferForm = {
  buyerName: "",
  quantityKg: "",
  priceRwfPerKg: "",
  deliveryRequirements: "",
};

const emptyRequest: RequestForm = {
  buyerName: "",
  crop: "Maize",
  location: "",
  quantityKg: "",
  deliveryDate: "",
  deliveryRequirements: "",
};

export function MarketAccess({ role }: { role: FinancialRole }) {
  if (role === "buyer") return <BuyerDashboard />;
  if (role === "admin") {
    return (
      <div className="space-y-8">
        <FarmerMarket />
        <BuyerDashboard />
      </div>
    );
  }
  return <FarmerMarket />;
}

function FarmerMarket() {
  const { data, saveMarketListing, deleteMarketListing, saveMarketOffer } = useStore();
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const farm = selectedFarm(data);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MarketListing | null>(null);
  const [listingForm, setListingForm] = useState<ListingForm>(emptyListing);
  const [formError, setFormError] = useState("");
  const [replying, setReplying] = useState<MarketOffer | null>(null);
  const [replyForm, setReplyForm] = useState<OfferForm>(emptyOffer);
  const [replyError, setReplyError] = useState("");

  const farmListings = financial.listings.filter((listing) => listing.farmId === farm?.id);
  const openListings = farmListings.filter((listing) => listing.status === "open");
  const farmOffers = financial.offers.filter((offer) => offer.farmId === farm?.id);
  const offersToReview = farmOffers.filter(
    (offer) =>
      (offer.offeredBy === "buyer" &&
        offer.status === "countered" &&
        (offer.listingId !== null || offer.requestId !== null)) ||
      (offer.listingId !== null &&
        offer.offeredBy === "buyer" &&
        offer.status === "pending"),
  );
  const expectedKg = openListings
    .filter((listing) => listing.availability === "expected")
    .reduce((sum, listing) => sum + listing.quantityKg, 0);
  const committedKg = openListings.reduce(
    (sum, listing) => sum + acceptedListingQuantity(financial, listing.id),
    0,
  );
  const remainingKg = openListings.reduce(
    (sum, listing) => sum + remainingListingQuantity(financial, listing),
    0,
  );
  const expectedSalesValue = openListings
    .filter((listing) => listing.availability === "expected")
    .reduce(
      (sum, listing) =>
        sum + remainingListingQuantity(financial, listing) * listing.priceRwfPerKg,
      0,
    );
  const harvestOptions = data.harvests.filter(
    (harvest) =>
      harvest.farmId === listingForm.farmId &&
      !financial.listings.some(
        (listing) =>
          listing.harvestId === harvest.id &&
          listing.id !== editing?.id,
      ),
  );
  const seasonOptions = data.seasons.filter((season) => season.farmId === listingForm.farmId);

  function openCreate() {
    setEditing(null);
    setFormError("");
    const firstSeason = data.seasons
      .filter((season) => season.farmId === farm?.id)
      .sort((a, b) => b.expectedHarvestDate.localeCompare(a.expectedHarvestDate))[0];
    const previousHarvests = data.harvests.filter(
      (harvest) => harvest.farmId === farm?.id && harvest.crop === farm?.crop,
    );
    const priorExpectedQuantity = previousHarvests.length
      ? Math.round(
          previousHarvests.reduce((sum, harvest) => sum + harvest.quantityKg, 0) /
            previousHarvests.length,
        )
      : "";
    setListingForm({
      ...emptyListing,
      farmId: farm?.id ?? data.farms[0]?.id ?? "",
      crop: farm?.crop ?? "Maize",
      seasonId: firstSeason?.id ?? "",
      harvestDate: firstSeason?.expectedHarvestDate ?? "",
      quantityKg: String(priorExpectedQuantity),
    });
    setCreating(true);
  }

  function openEdit(listing: MarketListing) {
    setEditing(listing);
    setFormError("");
    setListingForm({
      farmId: listing.farmId,
      availability: listing.availability,
      seasonId: listing.seasonId ?? "",
      harvestId: listing.harvestId ?? "",
      crop: listing.crop,
      quantityKg: String(listing.quantityKg),
      harvestDate: listing.expectedHarvestDate,
      quality: listing.quality,
      priceRwfPerKg: String(listing.priceRwfPerKg),
      minimumOrderKg: String(listing.minimumOrderKg),
      publish: true,
    });
    setCreating(true);
  }

  function updateHarvest(harvestId: string) {
    const harvest = data.harvests.find((item) => item.id === harvestId);
    setListingForm((current) => ({
      ...current,
      harvestId,
      crop: harvest?.crop ?? current.crop,
      harvestDate: harvest?.date ?? current.harvestDate,
      quantityKg: harvest ? String(harvest.quantityKg) : current.quantityKg,
    }));
  }

  function saveListing() {
    const quantity = Number(listingForm.quantityKg);
    const price = Number(listingForm.priceRwfPerKg);
    const minimumOrder = Number(listingForm.minimumOrderKg);
    const nextFarm = data.farms.find((item) => item.id === listingForm.farmId);
    if (!nextFarm) {
      setFormError("Choose a registered farm.");
      return;
    }
    if (!listingForm.publish) {
      setFormError("Confirm that you authorize publication to the buyer marketplace.");
      return;
    }
    if (listingForm.availability === "available" && !listingForm.harvestId) {
      setFormError("Choose a recorded harvest for available produce.");
      return;
    }
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(minimumOrder) ||
      minimumOrder <= 0 ||
      minimumOrder > quantity
    ) {
      setFormError("Enter a quantity, price, and minimum order greater than zero. Minimum order must not exceed quantity.");
      return;
    }
    if (!listingForm.harvestDate || !listingForm.quality.trim()) {
      setFormError("Add a harvest date and quality information.");
      return;
    }
    if (listingForm.harvestId) {
      const harvested = data.harvests.find((item) => item.id === listingForm.harvestId);
      const alreadyListed = financial.listings
        .filter((item) => item.harvestId === listingForm.harvestId && item.id !== editing?.id)
        .reduce((sum, item) => sum + item.quantityKg, 0);
      if (harvested && quantity + alreadyListed > harvested.quantityKg) {
        setFormError(
          `This harvest has ${formatNumber(Math.max(0, harvested.quantityKg - alreadyListed))} kg available to list.`,
        );
        return;
      }
    }
    saveMarketListing({
      id: editing?.id ?? uid(),
      farmId: nextFarm.id,
      seasonId: listingForm.availability === "expected" ? listingForm.seasonId || null : null,
      harvestId: listingForm.availability === "available" ? listingForm.harvestId : null,
      availability: listingForm.availability,
      crop: listingForm.crop,
      quantityKg: quantity,
      expectedHarvestDate: listingForm.harvestDate,
      quality: listingForm.quality.trim(),
      priceRwfPerKg: price,
      minimumOrderKg: minimumOrder,
      status: editing?.status ?? "open",
      sample: editing?.sample ?? false,
    });
    setCreating(false);
    setEditing(null);
  }

  function beginReply(offer: MarketOffer) {
    setReplying(offer);
    setReplyError("");
    setReplyForm({
      buyerName: offer.buyerName,
      quantityKg: String(offer.quantityKg),
      priceRwfPerKg: String(offer.priceRwfPerKg),
      deliveryRequirements: offer.deliveryRequirements,
    });
  }

  function respondToOffer(action: "accept" | "reject" | "counter") {
    if (!replying) return;
    if (action === "reject") {
      saveMarketOffer({ ...replying, status: "rejected" });
      setReplying(null);
      return;
    }
    const quantityKg = Number(replyForm.quantityKg);
    const priceRwfPerKg = Number(replyForm.priceRwfPerKg);
    if (!Number.isFinite(quantityKg) || quantityKg <= 0 || !Number.isFinite(priceRwfPerKg) || priceRwfPerKg <= 0) {
      setReplyError("Enter a positive quantity and price.");
      return;
    }
    if (action === "accept" && replying.listingId) {
      const listing = financial.listings.find((item) => item.id === replying.listingId);
      if (listing && quantityKg > remainingListingQuantity(financial, listing)) {
        setReplyError(
          `Only ${formatNumber(remainingListingQuantity(financial, listing))} kg remains uncommitted.`,
        );
        return;
      }
    }
    if (action === "accept" && replying.requestId) {
      const request = financial.procurementRequests.find((item) => item.id === replying.requestId);
      const alreadyAccepted = financial.offers
        .filter(
          (item) =>
            item.requestId === replying.requestId &&
            item.status === "accepted" &&
            item.id !== replying.id,
        )
        .reduce((sum, item) => sum + item.quantityKg, 0);
      if (request && alreadyAccepted + quantityKg > request.quantityKg) {
        setReplyError(
          `Only ${formatNumber(Math.max(0, request.quantityKg - alreadyAccepted))} kg remains on the buyer request.`,
        );
        return;
      }
    }
    const firstRequestOffer = replying.id === "" && replying.requestId !== null;
    saveMarketOffer({
      ...replying,
      id: replying.id || uid(),
      buyerName: replyForm.buyerName,
      quantityKg,
      priceRwfPerKg,
      deliveryRequirements: replyForm.deliveryRequirements.trim(),
      offeredBy: action === "counter" ? "farmer" : replying.offeredBy,
      status: action === "counter" ? (firstRequestOffer ? "pending" : "countered") : "accepted",
    });
    setReplying(null);
  }

  if (!farm) {
    return (
      <EmptyState
        icon={<ShoppingBasket className="h-5 w-5" />}
        title="Register a farm before listing produce"
        body="A farmer listing must be connected to a farm record so crop, location, and season can be verified."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-forest-900">Farmer market dashboard</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          List expected or harvested produce with a farmer-proposed price. Listings are saved on
          this device and appear in Buyer view here; they are not sent to external buyers.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Expected produce listed" value={`${formatNumber(expectedKg)} kg`} />
        <Metric label="Buyer offers" value={formatNumber(farmOffers.length)} />
        <Metric label="Quantity committed" value={`${formatNumber(committedKg)} kg`} />
        <Metric label="Remaining uncommitted" value={`${formatNumber(remainingKg)} kg`} />
        <Metric label="Estimated sales value" value={`${formatNumber(expectedSalesValue)} RWF`} hint="At proposed prices" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-forest-900">Your produce listings</h3>
              <p className="mt-1 text-sm text-slate-600">{farm.name} · {farm.location}</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              List produce
            </Button>
          </div>
          {farmListings.length === 0 ? (
            <p className="mt-4 rounded-xl bg-mist px-4 py-6 text-center text-sm text-slate-600">
              No produce listings for this farm yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {farmListings.map((listing) => (
                <li key={listing.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-forest-900">{listing.crop}</span>
                    <AvailabilityPill availability={listing.availability} />
                    {listing.sample ? <SampleBadge /> : null}
                    <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                      {statusLabel(listing.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatNumber(listing.quantityKg)} kg · {formatNumber(listing.priceRwfPerKg)} RWF/kg ·
                    {" "}minimum {formatNumber(listing.minimumOrderKg)} kg
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {listing.availability === "expected" ? "Expected" : "Harvest date"}{" "}
                    {formatDate(listing.expectedHarvestDate)} ·{" "}
                    {formatNumber(remainingListingQuantity(financial, listing))} kg uncommitted
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{listing.quality}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openEdit(listing)}>Edit</Button>
                    {listing.status === "open" ? (
                      <Button
                        variant="secondary"
                        onClick={() => saveMarketListing({ ...listing, status: "closed" })}
                      >
                        Close listing
                      </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => deleteMarketListing(listing.id)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-forest-900">Buyer offers &amp; procurement requests</h3>
          {offersToReview.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              New offers and responses to your proposals will appear here.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {offersToReview.map((offer) => (
                <li key={offer.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-forest-900">{offer.buyerName}</span>
                    {offer.sample ? <SampleBadge /> : null}
                    <span className="ml-auto rounded-full bg-fresh-50 px-2.5 py-1 text-xs font-medium text-forest-800">
                      {statusLabel(offer.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatNumber(offer.quantityKg)} kg · {formatNumber(offer.priceRwfPerKg)} RWF/kg
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{offer.deliveryRequirements || "No delivery details supplied."}</p>
                  <div className="mt-3">
                    <Button variant="secondary" onClick={() => beginReply(offer)}>
                      <Handshake className="h-4 w-4" />
                      Review, accept or negotiate
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-forest-900">Buyer procurement requests</h3>
        <p className="mt-1 text-sm text-slate-600">
          Responses are saved on this device and appear in Buyer view. They are not sent to the named buyer.
        </p>
        <RequestList
          role="farmer"
          farmId={farm.id}
          onRespond={(request) => {
            setReplying({
              id: "",
              listingId: null,
              requestId: request.id,
              farmId: farm.id,
              buyerName: request.buyerName,
              offeredBy: "farmer",
              quantityKg: 0,
              priceRwfPerKg: 0,
              deliveryRequirements: request.deliveryRequirements,
              status: "pending",
              createdAt: todayISO(),
              sample: request.sample,
            });
            setReplyForm(emptyOffer);
            setReplyError("");
          }}
        />
      </Card>

      <Modal
        open={creating}
        title={editing ? "Edit produce listing" : "List produce for buyers"}
        subtitle="Expected quantities and farmer-proposed prices are estimates, not guaranteed delivery or market prices."
        onClose={() => setCreating(false)}
        wide
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveListing();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Farm"
              value={listingForm.farmId}
              onChange={(event) => {
                const nextFarm = data.farms.find((item) => item.id === event.target.value);
                setListingForm({
                  ...listingForm,
                  farmId: event.target.value,
                  seasonId: "",
                  harvestId: "",
                  crop: nextFarm?.crop ?? listingForm.crop,
                  availability: "expected",
                });
              }}
            >
              <option value="">Select a farm</option>
              {data.farms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
            <SelectField
              label="Produce availability"
              value={listingForm.availability}
              onChange={(event) => setListingForm({
                ...listingForm,
                availability: event.target.value as ProduceAvailability,
                harvestId: "",
              })}
            >
              <option value="expected">Expected before harvest</option>
              <option value="available">Already harvested and available</option>
            </SelectField>
          </div>
          {listingForm.availability === "expected" ? (
            <SelectField
              label="Growing season"
              value={listingForm.seasonId}
              onChange={(event) => {
                const season = seasonOptions.find((item) => item.id === event.target.value);
                setListingForm({
                  ...listingForm,
                  seasonId: event.target.value,
                  harvestDate: season?.expectedHarvestDate ?? listingForm.harvestDate,
                });
              }}
            >
              <option value="">Not linked to a season</option>
              {seasonOptions.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
            </SelectField>
          ) : (
            <SelectField
              label="Recorded harvest"
              value={listingForm.harvestId}
              onChange={(event) => updateHarvest(event.target.value)}
            >
              <option value="">Choose a farm harvest</option>
              {harvestOptions.map((harvest) => (
                <option key={harvest.id} value={harvest.id}>
                  {harvest.crop} · {formatDate(harvest.date)} · {formatNumber(harvest.quantityKg)} kg
                </option>
              ))}
            </SelectField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Crop"
              value={listingForm.crop}
              onChange={(event) => setListingForm({ ...listingForm, crop: event.target.value })}
            >
              {CROPS.map((crop) => <option key={crop}>{crop}</option>)}
            </SelectField>
            <TextField
              label={listingForm.availability === "expected" ? "Expected harvest date" : "Harvest date"}
              type="date"
              value={listingForm.harvestDate}
              onChange={(event) => setListingForm({ ...listingForm, harvestDate: event.target.value })}
            />
            <TextField
              label={listingForm.availability === "expected" ? "Estimated quantity (kg)" : "Available quantity (kg)"}
              type="number"
              min="1"
              step="1"
              value={listingForm.quantityKg}
              onChange={(event) => setListingForm({ ...listingForm, quantityKg: event.target.value })}
            />
            <TextField
              label="Farmer-proposed price (RWF/kg)"
              type="number"
              min="1"
              step="1"
              value={listingForm.priceRwfPerKg}
              onChange={(event) => setListingForm({ ...listingForm, priceRwfPerKg: event.target.value })}
            />
            <TextField
              label="Minimum order (kg)"
              type="number"
              min="1"
              step="1"
              value={listingForm.minimumOrderKg}
              onChange={(event) => setListingForm({ ...listingForm, minimumOrderKg: event.target.value })}
            />
          </div>
          <TextAreaField
            label="Quality information"
            value={listingForm.quality}
            onChange={(event) => setListingForm({ ...listingForm, quality: event.target.value })}
            placeholder="Grade, moisture, packaging, certification, or inspection notes"
          />
          <label className="flex items-start gap-2 rounded-xl border border-forest-200 bg-fresh-50 p-3 text-sm leading-5 text-forest-900">
            <input
              type="checkbox"
              checked={listingForm.publish}
              onChange={(event) => setListingForm({ ...listingForm, publish: event.target.checked })}
              className="mt-1 accent-forest-700"
            />
            <span>
              I authorize EZA to publish this farm profile, crop, location, availability, quantity,
              quality notes, and proposed price in Buyer view on this device.
            </span>
          </label>
          {formError ? <p role="alert" className="text-sm text-red-700">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save listing" : "Publish listing"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(replying)}
        title={replying?.requestId && !replying?.listingId ? "Respond to procurement request" : "Negotiate buyer offer"}
        subtitle="Accept the terms, reject the offer, or send a counteroffer."
        onClose={() => setReplying(null)}
      >
        {replying ? (
          <div className="space-y-4">
            {replying.requestId && !replying.listingId ? (
              <p className="rounded-xl bg-mist p-3 text-sm leading-5 text-slate-700">
                Responding shares {farm.name}, {farm.location}, crop {farm.crop}, and your estimated
                quantity and proposed price with {replying.buyerName}.
              </p>
            ) : null}
            <TextField
              label="Buyer"
              value={replyForm.buyerName}
              onChange={(event) => setReplyForm({ ...replyForm, buyerName: event.target.value })}
              disabled={Boolean(replying.listingId)}
            />
            <TextField
              label="Quantity (kg)"
              type="number"
              min="1"
              value={replyForm.quantityKg}
              onChange={(event) => setReplyForm({ ...replyForm, quantityKg: event.target.value })}
            />
            <TextField
              label="Proposed price (RWF/kg)"
              type="number"
              min="1"
              value={replyForm.priceRwfPerKg}
              onChange={(event) => setReplyForm({ ...replyForm, priceRwfPerKg: event.target.value })}
            />
            <TextAreaField
              label="Delivery requirements"
              value={replyForm.deliveryRequirements}
              onChange={(event) => setReplyForm({ ...replyForm, deliveryRequirements: event.target.value })}
            />
            {replyError ? <p role="alert" className="text-sm text-red-700">{replyError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              {replying.offeredBy === "buyer" ? (
                <Button variant="danger" onClick={() => respondToOffer("reject")}>Reject</Button>
              ) : null}
              {replying.offeredBy === "buyer" ? (
                <Button variant="secondary" onClick={() => respondToOffer("accept")}>Accept offer</Button>
              ) : null}
              <Button onClick={() => respondToOffer("counter")}>
                {replying.requestId && !replying.listingId ? "Send offer" : "Send counteroffer"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function BuyerDashboard() {
  const { data, saveMarketOffer, saveProcurementRequest, updateProcurementRequestStatus } = useStore();
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const [cropFilter, setCropFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [minimumQuantity, setMinimumQuantity] = useState("");
  const [beforeDate, setBeforeDate] = useState("");
  const [offerListing, setOfferListing] = useState<MarketListing | null>(null);
  const [offerForm, setOfferForm] = useState<OfferForm>(emptyOffer);
  const [offerError, setOfferError] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestForm>(emptyRequest);
  const [requestError, setRequestError] = useState("");
  const [respondingOffer, setRespondingOffer] = useState<MarketOffer | null>(null);
  const [counterForm, setCounterForm] = useState<OfferForm>(emptyOffer);
  const [counterError, setCounterError] = useState("");

  const activeRequests = financial.procurementRequests.filter((request) => request.status === "active");
  const incomingOffers = financial.offers.filter(
    (offer) =>
      offer.offeredBy === "farmer" &&
      (offer.status === "pending" || offer.status === "countered") &&
      (offer.requestId !== null || offer.listingId !== null),
  );
  const acceptedAgreements = financial.offers.filter((offer) => offer.status === "accepted");
  const cropOptions = [...new Set(financial.listings.map((listing) => listing.crop))].sort();
  const locationOptions = [...new Set(
    financial.listings
      .map((listing) => data.farms.find((farm) => farm.id === listing.farmId)?.location)
      .filter((location): location is string => Boolean(location)),
  )].sort();
  const listings = useMemo(
    () =>
      financial.listings
        .filter((listing) => listing.status === "open")
        .filter((listing) => cropFilter === "all" || listing.crop === cropFilter)
        .filter((listing) => {
          const farm = data.farms.find((item) => item.id === listing.farmId);
          return !locationFilter || farm?.location === locationFilter;
        })
        .filter((listing) => {
          const minimum = Number(minimumQuantity);
          return !minimumQuantity || listing.quantityKg >= minimum;
        })
        .filter((listing) => !beforeDate || listing.expectedHarvestDate <= beforeDate)
        .sort((a, b) => a.expectedHarvestDate.localeCompare(b.expectedHarvestDate)),
    [financial.listings, data.farms, cropFilter, locationFilter, minimumQuantity, beforeDate],
  );

  function placeOffer() {
    if (!offerListing) return;
    const quantityKg = Number(offerForm.quantityKg);
    const priceRwfPerKg = Number(offerForm.priceRwfPerKg);
    const remaining = remainingListingQuantity(financial, offerListing);
    if (!offerForm.buyerName.trim() || !Number.isFinite(quantityKg) || quantityKg < offerListing.minimumOrderKg || quantityKg > remaining) {
      setOfferError(`Enter a buyer name and a quantity between ${formatNumber(offerListing.minimumOrderKg)} and ${formatNumber(remaining)} kg.`);
      return;
    }
    if (!Number.isFinite(priceRwfPerKg) || priceRwfPerKg <= 0) {
      setOfferError("Enter a positive proposed price.");
      return;
    }
    saveMarketOffer({
      id: uid(),
      listingId: offerListing.id,
      requestId: null,
      farmId: offerListing.farmId,
      buyerName: offerForm.buyerName.trim(),
      offeredBy: "buyer",
      quantityKg,
      priceRwfPerKg,
      deliveryRequirements: offerForm.deliveryRequirements.trim(),
      status: "pending",
      createdAt: todayISO(),
      sample: false,
    });
    setOfferListing(null);
  }

  function createRequest() {
    const quantityKg = Number(requestForm.quantityKg);
    if (!requestForm.buyerName.trim() || !requestForm.location.trim() || !requestForm.deliveryRequirements.trim()) {
      setRequestError("Enter your organization, delivery location, and delivery requirements.");
      return;
    }
    if (!Number.isFinite(quantityKg) || quantityKg <= 0 || !requestForm.deliveryDate) {
      setRequestError("Enter a positive quantity and requested delivery date.");
      return;
    }
    saveProcurementRequest({
      id: uid(),
      buyerName: requestForm.buyerName.trim(),
      crop: requestForm.crop,
      location: requestForm.location.trim(),
      quantityKg,
      deliveryDate: requestForm.deliveryDate,
      deliveryRequirements: requestForm.deliveryRequirements.trim(),
      status: "active",
      sample: false,
    });
    setRequestOpen(false);
    setRequestForm(emptyRequest);
  }

  function startReview(offer: MarketOffer) {
    setRespondingOffer(offer);
    setCounterError("");
    setCounterForm({
      buyerName: offer.buyerName,
      quantityKg: String(offer.quantityKg),
      priceRwfPerKg: String(offer.priceRwfPerKg),
      deliveryRequirements: offer.deliveryRequirements,
    });
  }

  function respondToFarmerOffer(action: "accept" | "reject" | "counter") {
    if (!respondingOffer) return;
    if (action === "reject") {
      saveMarketOffer({ ...respondingOffer, status: "rejected" });
      setRespondingOffer(null);
      return;
    }
    const quantityKg = Number(counterForm.quantityKg);
    const priceRwfPerKg = Number(counterForm.priceRwfPerKg);
    if (!Number.isFinite(quantityKg) || quantityKg <= 0 || !Number.isFinite(priceRwfPerKg) || priceRwfPerKg <= 0) {
      setCounterError("Enter a positive quantity and price.");
      return;
    }
    if (action === "accept" && respondingOffer.requestId) {
      const request = financial.procurementRequests.find((item) => item.id === respondingOffer.requestId);
      const alreadyAccepted = financial.offers
        .filter(
          (item) =>
            item.requestId === respondingOffer.requestId &&
            item.status === "accepted" &&
            item.id !== respondingOffer.id,
        )
        .reduce((sum, item) => sum + item.quantityKg, 0);
      if (request && alreadyAccepted + quantityKg > request.quantityKg) {
        setCounterError(`Only ${formatNumber(Math.max(0, request.quantityKg - alreadyAccepted))} kg remains on this request.`);
        return;
      }
    }
    saveMarketOffer({
      ...respondingOffer,
      buyerName: counterForm.buyerName,
      quantityKg,
      priceRwfPerKg,
      deliveryRequirements: counterForm.deliveryRequirements.trim(),
      offeredBy: action === "counter" ? "buyer" : respondingOffer.offeredBy,
      status: action === "counter" ? "countered" : "accepted",
    });
    setRespondingOffer(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-forest-900">Find produce for your next order</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Browse farmer-published supply, make an offer, or post a procurement request.
          </p>
        </div>
        <Button onClick={() => { setRequestError(""); setRequestOpen(true); }}>
          <Plus className="h-4 w-4" />
          Create procurement request
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Active procurement requests" value={formatNumber(activeRequests.length)} />
        <Metric label="Incoming farmer offers" value={formatNumber(incomingOffers.length)} />
        <Metric label="Accepted agreements" value={formatNumber(acceptedAgreements.length)} />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-forest-900">Browse produce</h3>
            <p className="mt-1 text-xs text-slate-500">Filter by crop, location, quantity, or harvest date.</p>
          </div>
          <span className="hidden rounded-full bg-fresh-50 px-3 py-1 text-[11px] font-semibold text-forest-800 sm:inline-flex">
            {formatNumber(listings.length)} listings
          </span>
        </div>
        {cropOptions.length > 0 ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Crop categories">
            <button
              onClick={() => setCropFilter("all")}
              aria-pressed={cropFilter === "all"}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                cropFilter === "all" ? "border-forest-700 bg-forest-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-fresh-400"
              }`}
            >
              All crops
            </button>
            {cropOptions.map((crop) => (
              <button
                key={crop}
                onClick={() => setCropFilter(crop)}
                aria-pressed={cropFilter === crop}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                  cropFilter === crop ? "border-forest-700 bg-forest-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-fresh-400"
                }`}
              >
                {crop}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField label="Crop" value={cropFilter} onChange={(event) => setCropFilter(event.target.value)}>
            <option value="all">All crops</option>
            {cropOptions.map((crop) => <option key={crop}>{crop}</option>)}
          </SelectField>
          <SelectField label="Farm location" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
            <option value="">All locations</option>
            {locationOptions.map((location) => <option key={location}>{location}</option>)}
          </SelectField>
          <TextField label="Minimum quantity (kg)" type="number" min="0" value={minimumQuantity} onChange={(event) => setMinimumQuantity(event.target.value)} />
          <TextField label="Harvest by" type="date" value={beforeDate} onChange={(event) => setBeforeDate(event.target.value)} />
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          Crop reference photos are searched from Wikimedia Commons. Only crop names are used for
          image search; photos are illustrative and are not verified images of a listed farm.
        </p>
      </Card>

      <section>
        <h3 className="mb-3 font-semibold text-forest-900">Farmer produce listings</h3>
        {listings.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket className="h-5 w-5" />}
            title="No listings match these filters"
            body="Try another crop, location, quantity, or harvest date. Only farmer-published listings are shown."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => {
              const farm = data.farms.find((item) => item.id === listing.farmId);
              const observation = data.observations
                .filter((item) => item.farmId === listing.farmId)
                .filter((item) => !item.sample)
                .sort((a, b) => b.date.localeCompare(a.date))[0];
              return (
                <Card key={listing.id} className="overflow-hidden !p-0">
                  <div className="relative h-36 overflow-hidden bg-fresh-50">
                    <LiveCropImage
                      crop={listing.crop}
                      fallbackSrc={observation?.photoDataUrl}
                      className="h-full w-full"
                    />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <AvailabilityPill availability={listing.availability} />
                      {listing.sample ? <SampleBadge /> : null}
                    </div>
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-forest-800 shadow-sm">
                      {formatNumber(remainingListingQuantity(financial, listing))} kg available
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-forest-900">{listing.crop}</h4>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5" /> {farm?.name ?? "Farm"} · {farm?.location ?? "Location not listed"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-forest-800">{formatNumber(listing.priceRwfPerKg)} <span className="text-[10px] font-medium text-slate-500">RWF/kg</span></span>
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">{listing.quality}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                      <span className="text-slate-500">
                        {listing.availability === "expected" ? "Expected harvest" : "Harvested"} {formatDate(listing.expectedHarvestDate)}
                      </span>
                      <span className="font-medium text-slate-600">Min. {formatNumber(listing.minimumOrderKg)} kg</span>
                    </div>
                    <Button
                      className="mt-4 w-full"
                      disabled={remainingListingQuantity(financial, listing) < listing.minimumOrderKg}
                      onClick={() => {
                        setOfferListing(listing);
                        setOfferError("");
                        setOfferForm({
                          ...emptyOffer,
                          quantityKg: String(listing.minimumOrderKg),
                          priceRwfPerKg: String(listing.priceRwfPerKg),
                        });
                      }}
                    >
                      <Handshake className="h-4 w-4" />
                      Make purchase offer
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Card>
        <h3 className="font-semibold text-forest-900">Procurement requests &amp; farmer responses</h3>
        <RequestList
          role="buyer"
          farmId=""
          onRespond={(request) => {
            const offers = financial.offers.filter((offer) => offer.requestId === request.id);
            if (offers.length === 0) return;
            startReview(offers[offers.length - 1]);
          }}
          onCloseRequest={(request) =>
            updateProcurementRequestStatus(request.id, request.status === "active" ? "closed" : "active")
          }
          onOffer={(request) => {
            const offers = financial.offers.filter((offer) => offer.requestId === request.id);
            if (offers.length === 0) return;
            startReview(offers[offers.length - 1]);
          }}
        />
      </Card>

      <Card>
        <h3 className="font-semibold text-forest-900">Farmer offers to your requests</h3>
        {incomingOffers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Farmer responses to your active procurement requests will appear here.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {incomingOffers.map((offer) => {
              const farm = data.farms.find((item) => item.id === offer.farmId);
              const request = financial.procurementRequests.find((item) => item.id === offer.requestId);
              return (
                <li key={offer.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-forest-900">{farm?.name ?? "Farmer"}</span>
                    {offer.sample ? <SampleBadge /> : null}
                    <span className="ml-auto rounded-full bg-fresh-50 px-2.5 py-1 text-xs text-forest-800">
                      {statusLabel(offer.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {farm?.location} · {request?.crop} · {formatNumber(offer.quantityKg)} kg ·{" "}
                    {formatNumber(offer.priceRwfPerKg)} RWF/kg
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{offer.deliveryRequirements}</p>
                  <Button className="mt-3" variant="secondary" onClick={() => startReview(offer)}>
                    Review farmer offer
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-forest-900">Responses to buyer offers</h3>
        {financial.offers.filter(
          (offer) => offer.offeredBy === "farmer" && offer.listingId !== null,
        ).length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Farmer counteroffers on your purchase offers will appear here.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {financial.offers
              .filter((offer) => offer.offeredBy === "farmer" && offer.listingId !== null)
              .map((offer) => {
                const farm = data.farms.find((item) => item.id === offer.farmId);
                const listing = financial.listings.find((item) => item.id === offer.listingId);
                return (
                  <li key={offer.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-forest-900">{farm?.name ?? "Farmer"}</span>
                      {offer.sample ? <SampleBadge /> : null}
                      <span className="ml-auto rounded-full bg-fresh-50 px-2.5 py-1 text-xs text-forest-800">
                        {statusLabel(offer.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {listing?.crop} · {formatNumber(offer.quantityKg)} kg · {formatNumber(offer.priceRwfPerKg)} RWF/kg
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Expected delivery {listing ? formatDate(listing.expectedHarvestDate) : "date not available"}
                    </p>
                    <Button className="mt-3" variant="secondary" onClick={() => startReview(offer)}>
                      Review farmer response
                    </Button>
                  </li>
                );
              })}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-forest-900">Accepted agreements</h3>
        {acceptedAgreements.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Accepted quantities and delivery dates will appear here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {acceptedAgreements.map((offer) => {
              const listing = financial.listings.find((item) => item.id === offer.listingId);
              const request = financial.procurementRequests.find((item) => item.id === offer.requestId);
              const farm = data.farms.find((item) => item.id === offer.farmId);
              return (
                <li key={offer.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-forest-900">{farm?.name ?? offer.buyerName}</span>
                    <span className="text-slate-600">
                      {listing?.crop ?? request?.crop} · {formatNumber(offer.quantityKg)} kg ·{" "}
                      {formatNumber(offer.priceRwfPerKg)} RWF/kg
                    </span>
                    {offer.sample ? <SampleBadge /> : null}
                  </div>
                  <span className="text-xs text-slate-500">
                    Expected delivery{" "}
                    {listing
                      ? formatDate(listing.expectedHarvestDate)
                      : request
                        ? formatDate(request.deliveryDate)
                        : "to be agreed"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(offerListing)}
        title="Make a purchase offer"
        subtitle={offerListing ? `${offerListing.crop} · ${offerListing.availability === "expected" ? "expected" : "available"} produce` : undefined}
        onClose={() => setOfferListing(null)}
      >
        {offerListing ? (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); placeOffer(); }}>
            <TextField label="Buyer organization" value={offerForm.buyerName} onChange={(event) => setOfferForm({ ...offerForm, buyerName: event.target.value })} placeholder="Your cooperative or business" />
            <TextField
              label={`Quantity (kg) · minimum ${formatNumber(offerListing.minimumOrderKg)}, remaining ${formatNumber(remainingListingQuantity(financial, offerListing))}`}
              type="number"
              min={offerListing.minimumOrderKg}
              max={remainingListingQuantity(financial, offerListing)}
              value={offerForm.quantityKg}
              onChange={(event) => setOfferForm({ ...offerForm, quantityKg: event.target.value })}
            />
            <TextField label="Offer price (RWF/kg)" type="number" min="1" value={offerForm.priceRwfPerKg} onChange={(event) => setOfferForm({ ...offerForm, priceRwfPerKg: event.target.value })} />
            <TextAreaField label="Delivery requirements" value={offerForm.deliveryRequirements} onChange={(event) => setOfferForm({ ...offerForm, deliveryRequirements: event.target.value })} placeholder="Destination, delivery timing, quality checks" />
            {offerError ? <p role="alert" className="text-sm text-red-700">{offerError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOfferListing(null)}>Cancel</Button>
              <Button type="submit">Submit offer</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={requestOpen} title="Create procurement request" subtitle="Requests are saved on this device and appear in Farmer view." onClose={() => setRequestOpen(false)}>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); createRequest(); }}>
          <TextField label="Buyer organization" value={requestForm.buyerName} onChange={(event) => setRequestForm({ ...requestForm, buyerName: event.target.value })} />
          <SelectField label="Crop" value={requestForm.crop} onChange={(event) => setRequestForm({ ...requestForm, crop: event.target.value })}>
            {CROPS.map((crop) => <option key={crop}>{crop}</option>)}
          </SelectField>
          <TextField label="Delivery location" value={requestForm.location} onChange={(event) => setRequestForm({ ...requestForm, location: event.target.value })} placeholder="District or collection point" />
          <TextField label="Quantity needed (kg)" type="number" min="1" value={requestForm.quantityKg} onChange={(event) => setRequestForm({ ...requestForm, quantityKg: event.target.value })} />
          <TextField label="Requested delivery date" type="date" value={requestForm.deliveryDate} onChange={(event) => setRequestForm({ ...requestForm, deliveryDate: event.target.value })} />
          <TextAreaField label="Delivery and quality requirements" value={requestForm.deliveryRequirements} onChange={(event) => setRequestForm({ ...requestForm, deliveryRequirements: event.target.value })} />
          {requestError ? <p role="alert" className="text-sm text-red-700">{requestError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button type="submit">Publish request</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(respondingOffer)} title="Review farmer offer" subtitle="Accept, decline, or return a counteroffer." onClose={() => setRespondingOffer(null)}>
        {respondingOffer ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-mist p-3 text-sm text-slate-700">
              <p className="font-semibold text-forest-900">{data.farms.find((item) => item.id === respondingOffer.farmId)?.name ?? "Farmer"}</p>
              <p>{data.farms.find((item) => item.id === respondingOffer.farmId)?.location} · Farmer-provided offer</p>
            </div>
            <TextField label="Quantity (kg)" type="number" min="1" value={counterForm.quantityKg} onChange={(event) => setCounterForm({ ...counterForm, quantityKg: event.target.value })} />
            <TextField label="Proposed price (RWF/kg)" type="number" min="1" value={counterForm.priceRwfPerKg} onChange={(event) => setCounterForm({ ...counterForm, priceRwfPerKg: event.target.value })} />
            <TextAreaField label="Delivery requirements" value={counterForm.deliveryRequirements} onChange={(event) => setCounterForm({ ...counterForm, deliveryRequirements: event.target.value })} />
            {counterError ? <p role="alert" className="text-sm text-red-700">{counterError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="danger" onClick={() => respondToFarmerOffer("reject")}>Reject offer</Button>
              <Button variant="secondary" onClick={() => respondToFarmerOffer("accept")}>Accept offer</Button>
              <Button onClick={() => respondToFarmerOffer("counter")}>Send counteroffer</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function RequestList({
  role,
  farmId,
  onRespond,
  onCloseRequest,
  onOffer,
}: {
  role: "farmer" | "buyer";
  farmId: string;
  onRespond: (request: ProcurementRequest) => void;
  onCloseRequest?: (request: ProcurementRequest) => void;
  onOffer?: (request: ProcurementRequest) => void;
}) {
  const { data } = useStore();
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const requests = financial.procurementRequests
    .filter((request) => role === "buyer" || request.status === "active")
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  if (!requests.length) {
    return <p className="mt-3 text-sm text-slate-600">No procurement requests have been posted.</p>;
  }
  return (
    <ul className="mt-3 space-y-3">
      {requests.map((request) => {
        const relatedOffers = financial.offers.filter(
          (offer) => offer.requestId === request.id && (!farmId || offer.farmId === farmId),
        );
        const alreadyProposed = relatedOffers.length > 0;
        const accepted = financial.offers
          .filter((offer) => offer.requestId === request.id && offer.status === "accepted")
          .reduce((sum, offer) => sum + offer.quantityKg, 0);
        const remaining = Math.max(0, request.quantityKg - accepted);
        return (
          <li key={request.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-forest-900">{request.crop}</span>
              {request.sample ? <SampleBadge /> : null}
              <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {statusLabel(request.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {request.buyerName} · {request.location} · {formatNumber(request.quantityKg)} kg requested
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Deliver by {formatDate(request.deliveryDate)} · {formatNumber(remaining)} kg not yet agreed
            </p>
            <p className="mt-1 text-sm text-slate-700">{request.deliveryRequirements}</p>
            {role === "farmer" && request.status === "active" && !alreadyProposed ? (
              <Button className="mt-3" variant="secondary" onClick={() => onRespond(request)}>
                <Wheat className="h-4 w-4" />
                Respond with farm offer
              </Button>
            ) : null}
            {role === "farmer" && alreadyProposed ? (
              <p className="mt-2 text-xs text-slate-500">Your farm has already responded to this request.</p>
            ) : null}
            {role === "buyer" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {relatedOffers.length ? (
                  <Button variant="secondary" onClick={() => onOffer?.(request)}>
                    Review farmer responses ({relatedOffers.length})
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => onCloseRequest?.(request)}>
                  {request.status === "active" ? "Close request" : "Reopen request"}
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-forest-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

function AvailabilityPill({ availability }: { availability: ProduceAvailability }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        availability === "expected"
          ? "bg-amber-100 text-amber-950"
          : "bg-fresh-100 text-forest-800"
      }`}
    >
      {availability === "expected" ? "Expected produce" : "Harvested · available"}
    </span>
  );
}
