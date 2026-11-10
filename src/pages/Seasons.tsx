import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FarmFilter, useFarmSelection } from "../filters";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  ProgressBar,
  SampleBadge,
  SelectField,
  StatusPill,
  TextField,
} from "../components";
import { farmById, formatDate, seasonProgress, seasonStatus, uid } from "../model";
import { useStore } from "../store";
import type { Season } from "../types";

interface SeasonForm {
  farmId: string;
  name: string;
  plantingDate: string;
  expectedHarvestDate: string;
}

export function SeasonsPage() {
  const { data, saveSeason, deleteSeason } = useStore();
  const [farmFilter, setFarmFilter] = useFarmSelection();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Season | null>(null);
  const [form, setForm] = useState<SeasonForm>({
    farmId: "",
    name: "",
    plantingDate: "",
    expectedHarvestDate: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SeasonForm, string>>>({});

  const seasons = useMemo(() => {
    return data.seasons
      .filter((season) => farmFilter === "all" || season.farmId === farmFilter)
      .sort((a, b) => (a.plantingDate < b.plantingDate ? 1 : -1));
  }, [data.seasons, farmFilter]);

  function openCreate() {
    setEditing(null);
    setErrors({});
    setForm({
      farmId: farmFilter !== "all" ? farmFilter : data.farms[0]?.id ?? "",
      name: "Season A 2026",
      plantingDate: "",
      expectedHarvestDate: "",
    });
    setCreating(true);
  }

  function openEdit(season: Season) {
    setEditing(season);
    setErrors({});
    setForm({
      farmId: season.farmId,
      name: season.name,
      plantingDate: season.plantingDate,
      expectedHarvestDate: season.expectedHarvestDate,
    });
    setCreating(true);
  }

  function submit() {
    const nextErrors: Partial<Record<keyof SeasonForm, string>> = {};
    if (!form.farmId) nextErrors.farmId = "Choose a farm.";
    if (!form.name.trim()) nextErrors.name = "Enter a season name.";
    if (!form.plantingDate) nextErrors.plantingDate = "Enter the planting date.";
    if (!form.expectedHarvestDate) nextErrors.expectedHarvestDate = "Enter the expected harvest date.";
    if (form.plantingDate && form.expectedHarvestDate && form.expectedHarvestDate <= form.plantingDate) {
      nextErrors.expectedHarvestDate = "Expected harvest must be after planting.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    saveSeason({
      id: editing?.id ?? uid(),
      farmId: form.farmId,
      name: form.name.trim(),
      plantingDate: form.plantingDate,
      expectedHarvestDate: form.expectedHarvestDate,
      sample: editing?.sample ?? false,
    });
    setCreating(false);
    setEditing(null);
  }

  return (
    <div>
      <PageHeader
        title="Seasons"
        description="Create a growing season for a farm, with a planting date and an expected harvest date. Progress is calculated from those dates."
        action={
          <Button onClick={openCreate} disabled={data.farms.length === 0}>
            <Plus className="h-4 w-4" />
            New season
          </Button>
        }
      />
      <div className="mb-4">
        <FarmFilter value={farmFilter} onChange={setFarmFilter} />
      </div>

      {data.farms.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-5 w-5" />}
          title="Register a farm first"
          body="A season belongs to a farm. Add a farm, then record planting and the expected harvest."
        />
      ) : data.seasons.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-5 w-5" />}
          title="No growing seasons"
          body="Create a season to follow progress from planting through the expected harvest."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New season
            </Button>
          }
        />
      ) : seasons.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-5 w-5" />}
          title="No seasons for this farm"
          body="Choose another farm, or create a season for the one selected."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New season
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {seasons.map((season, index) => {
            const farm = farmById(data, season.farmId);
            const status = seasonStatus(data, season);
            const progress = seasonProgress(data, season);
            return (
              <article
                key={season.id}
                className={`rounded-2xl border border-[#c5d8c5] p-5 shadow-card transition-colors hover:bg-[#c4dfc4] ${
                  index % 2 === 0 ? "bg-white" : "bg-[#dcebdd]"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-forest-900">{season.name}</h2>
                      <StatusPill status={status} />
                      {season.sample ? <SampleBadge /> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {farm?.name ?? "Unknown farm"} · {farm?.crop} · {farm?.location}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => openEdit(season)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="danger" className="min-h-9 px-3 text-xs" onClick={() => setPendingDelete(season)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Planted</dt>
                    <dd className="mt-1 font-medium text-forest-900">{formatDate(season.plantingDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Expected harvest</dt>
                    <dd className="mt-1 font-medium text-forest-900">{formatDate(season.expectedHarvestDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Progress</dt>
                    <dd className="mt-1 font-medium text-forest-900">{progress}%</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <ProgressBar value={status === "overdue" ? 100 : progress} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={creating}
        title={editing ? "Edit season" : "New growing season"}
        subtitle="Progress uses the planting date and the expected harvest date."
        onClose={() => setCreating(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <SelectField
            label="Farm"
            value={form.farmId}
            error={errors.farmId}
            onChange={(event) => setForm({ ...form, farmId: event.target.value })}
          >
            <option value="">Select a farm</option>
            {data.farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Season name"
            value={form.name}
            error={errors.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Season A 2026"
          />
          <TextField
            label="Planting date"
            type="date"
            value={form.plantingDate}
            error={errors.plantingDate}
            onChange={(event) => setForm({ ...form, plantingDate: event.target.value })}
          />
          <TextField
            label="Expected harvest date"
            type="date"
            value={form.expectedHarvestDate}
            error={errors.expectedHarvestDate}
            onChange={(event) => setForm({ ...form, expectedHarvestDate: event.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Save season"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this season?"
        body="Inputs, notes, and harvests stay on the farm, but they will no longer be linked to this season."
        confirmLabel="Delete season"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteSeason(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
