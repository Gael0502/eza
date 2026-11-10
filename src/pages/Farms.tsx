import { Pencil, Plus, Sprout, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNav } from "../nav";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  SampleBadge,
  SelectField,
  TextField,
} from "../components";
import { CROPS, DISTRICTS, formatNumber, todayISO, uid } from "../model";
import { useStore } from "../store";
import type { Farm } from "../types";

interface FarmForm {
  name: string;
  location: string;
  sizeHa: string;
  crop: string;
}

const blankForm: FarmForm = { name: "", location: "Musanze", sizeHa: "", crop: "Maize" };

export function FarmsPage() {
  const { data, saveFarm, deleteFarm } = useStore();
  const { farmId } = useNav();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Farm | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Farm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Farm | null>(null);
  const [form, setForm] = useState<FarmForm>(blankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FarmForm, string>>>({});

  useEffect(() => {
    if (!farmId) return;
    const match = data.farms.find((farm) => farm.id === farmId);
    if (match) setViewing(match);
  }, [farmId, data.farms]);

  const farms = useMemo(() => {
    const text = query.trim().toLowerCase();
    return data.farms
      .filter((farm) => {
        if (!text) return true;
        return (
          farm.name.toLowerCase().includes(text) ||
          farm.location.toLowerCase().includes(text) ||
          farm.crop.toLowerCase().includes(text)
        );
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [data.farms, query]);

  function openCreate() {
    setErrors({});
    setForm(blankForm);
    setEditing(null);
    setCreating(true);
  }

  function openEdit(farm: Farm) {
    setErrors({});
    setForm({
      name: farm.name,
      location: farm.location,
      sizeHa: String(farm.sizeHa),
      crop: farm.crop,
    });
    setEditing(farm);
    setCreating(true);
    setViewing(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  function submit() {
    const nextErrors: Partial<Record<keyof FarmForm, string>> = {};
    const size = Number(form.sizeHa);
    if (!form.name.trim()) nextErrors.name = "Enter the farm name.";
    if (!form.location) nextErrors.location = "Choose a location.";
    if (!Number.isFinite(size) || size <= 0) nextErrors.sizeHa = "Enter a size greater than zero.";
    if (!form.crop) nextErrors.crop = "Choose a crop.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    saveFarm({
      id: editing?.id ?? uid(),
      name: form.name.trim(),
      location: form.location,
      sizeHa: Math.round(size * 100) / 100,
      crop: form.crop,
      createdAt: editing?.createdAt ?? todayISO(),
      sample: editing?.sample ?? false,
    });
    closeForm();
  }

  const formOpen = creating;

  return (
    <div>
      <PageHeader
        title="Farms"
        description="Register a holding with its location, size, and main crop. Related seasons, inputs, and harvests stay linked to the farm."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Register farm
          </Button>
        }
      />

      <div className="mb-4">
        <label className="block max-w-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, district, or crop"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      {data.farms.length === 0 ? (
        <EmptyState
          icon={<Sprout className="h-5 w-5" />}
          title="No farms registered"
          body="Add the first farm to start tracking seasons, inputs, crop notes, and harvests."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Register farm
            </Button>
          }
        />
      ) : farms.length === 0 ? (
        <EmptyState
          icon={<Sprout className="h-5 w-5" />}
          title="No farms match that search"
          body="Try another name, district, or crop."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-card backdrop-blur-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-mist text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Farm</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Crop</th>
                  <th className="px-4 py-3 font-semibold">Linked records</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farms.map((farm) => {
                  const seasons = data.seasons.filter((season) => season.farmId === farm.id).length;
                  const inputs = data.inputs.filter((input) => input.farmId === farm.id).length;
                  const harvests = data.harvests.filter((harvest) => harvest.farmId === farm.id).length;
                  return (
                    <tr key={farm.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-forest-900">{farm.name}</span>
                          {farm.sample ? <SampleBadge /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{farm.location}</td>
                      <td className="px-4 py-3 text-slate-700">{formatNumber(farm.sizeHa, Number.isInteger(farm.sizeHa) ? 0 : 1)} ha</td>
                      <td className="px-4 py-3 text-slate-700">{farm.crop}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {seasons} season{seasons === 1 ? "" : "s"} · {inputs} input{inputs === 1 ? "" : "s"} · {harvests} harvest{harvests === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button variant="ghost" onClick={() => setViewing(farm)}>
                            View
                          </Button>
                          <Button variant="ghost" onClick={() => openEdit(farm)} aria-label={`Edit ${farm.name}`}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="ghost" onClick={() => setPendingDelete(farm)} aria-label={`Delete ${farm.name}`}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit farm" : "Register a farm"}
        subtitle="Farm details are saved on this device."
        onClose={closeForm}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <TextField
            label="Farm name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
            placeholder="Cooperative or holding name"
          />
          <SelectField
            label="Location"
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            error={errors.location}
          >
            {DISTRICTS.map((district) => (
              <option key={district}>{district}</option>
            ))}
            {form.location && !DISTRICTS.includes(form.location as (typeof DISTRICTS)[number]) ? (
              <option>{form.location}</option>
            ) : null}
          </SelectField>
          <TextField
            label="Size (hectares)"
            type="number"
            min="0"
            step="0.1"
            value={form.sizeHa}
            onChange={(event) => setForm({ ...form, sizeHa: event.target.value })}
            error={errors.sizeHa}
            placeholder="12.5"
          />
          <SelectField
            label="Main crop"
            value={form.crop}
            onChange={(event) => setForm({ ...form, crop: event.target.value })}
            error={errors.crop}
          >
            {CROPS.map((crop) => (
              <option key={crop}>{crop}</option>
            ))}
            {form.crop && !CROPS.includes(form.crop as (typeof CROPS)[number]) ? <option>{form.crop}</option> : null}
          </SelectField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Save farm"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(viewing)} title={viewing?.name ?? "Farm"} subtitle="Linked records for this farm" onClose={() => setViewing(null)} wide>
        {viewing ? <FarmDetail farm={viewing} onEdit={() => openEdit(viewing)} /> : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name ?? "farm"}?`}
        body="This removes the farm and its seasons, inputs, photographs, and harvest records saved on this device."
        confirmLabel="Delete farm"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteFarm(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function FarmDetail({ farm, onEdit }: { farm: Farm; onEdit: () => void }) {
  const { data } = useStore();
  const seasons = data.seasons.filter((season) => season.farmId === farm.id);
  const inputs = data.inputs.filter((input) => input.farmId === farm.id);
  const harvests = data.harvests.filter((harvest) => harvest.farmId === farm.id);
  const notes = data.observations.filter((observation) => observation.farmId === farm.id);
  const total = harvests.reduce((sum, harvest) => sum + harvest.quantityKg, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {farm.sample ? <SampleBadge /> : null}
        <span className="text-sm text-slate-600">
          {farm.location} · {formatNumber(farm.sizeHa, Number.isInteger(farm.sizeHa) ? 0 : 1)} ha · {farm.crop}
        </span>
        <Button variant="secondary" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-mist px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Seasons</p>
          <p className="mt-1 text-xl font-semibold text-forest-900">{seasons.length}</p>
        </div>
        <div className="rounded-xl bg-mist px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Inputs</p>
          <p className="mt-1 text-xl font-semibold text-forest-900">{inputs.length}</p>
        </div>
        <div className="rounded-xl bg-mist px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Harvest</p>
          <p className="mt-1 text-xl font-semibold text-forest-900">{formatNumber(total)} kg</p>
        </div>
      </div>
      <section>
        <h3 className="text-sm font-semibold text-forest-900">Seasons</h3>
        {seasons.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">No season has been created for this farm.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {seasons.map((season) => (
              <li key={season.id}>
                {season.name}: planted {season.plantingDate}, expected {season.expectedHarvestDate}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold text-forest-900">Recent inputs</h3>
        {inputs.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">No inputs recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {inputs
              .slice()
              .sort((a, b) => (a.applicationDate < b.applicationDate ? 1 : -1))
              .slice(0, 5)
              .map((input) => (
                <li key={input.id}>
                  {input.applicationDate} · {input.type} · {input.product} · {input.quantity} {input.unit}
                </li>
              ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold text-forest-900">Observations and harvests</h3>
        <p className="mt-1 text-sm text-slate-700">
          {notes.length} photograph{notes.length === 1 ? "" : "s"} or note{notes.length === 1 ? "" : "s"}. {harvests.length} harvest record{harvests.length === 1 ? "" : "s"}.
        </p>
      </section>
    </div>
  );
}
