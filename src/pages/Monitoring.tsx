import { Camera, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FarmFilter, useFarmSelection } from "../filters";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  SampleBadge,
  SelectField,
  TextAreaField,
  TextField,
} from "../components";
import { readImageFile } from "../images";
import { farmById, formatDate, seasonById, uid } from "../model";
import { useStore } from "../store";
import type { Observation } from "../types";

interface NoteForm {
  farmId: string;
  seasonId: string;
  date: string;
  notes: string;
  photoDataUrl: string;
  photoName: string;
}

export function MonitoringPage() {
  const { data, saveObservation, deleteObservation } = useStore();
  const [farmFilter, setFarmFilter] = useFarmSelection();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Observation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Observation | null>(null);
  const [preview, setPreview] = useState<Observation | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [reading, setReading] = useState(false);
  const [form, setForm] = useState<NoteForm>({
    farmId: "",
    seasonId: "",
    date: "",
    notes: "",
    photoDataUrl: "",
    photoName: "",
  });
  const [errors, setErrors] = useState<Partial<Record<"farmId" | "date" | "notes" | "photo", string>>>({});

  const notes = useMemo(() => {
    return data.observations
      .filter((observation) => farmFilter === "all" || observation.farmId === farmFilter)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data.observations, farmFilter]);

  const seasonOptions = data.seasons.filter((season) => season.farmId === form.farmId);

  function openCreate() {
    setEditing(null);
    setErrors({});
    setPhotoError("");
    setForm({
      farmId: farmFilter !== "all" ? farmFilter : data.farms[0]?.id ?? "",
      seasonId: "",
      date: "",
      notes: "",
      photoDataUrl: "",
      photoName: "",
    });
    setCreating(true);
  }

  function openEdit(observation: Observation) {
    setEditing(observation);
    setErrors({});
    setPhotoError("");
    setForm({
      farmId: observation.farmId,
      seasonId: observation.seasonId ?? "",
      date: observation.date,
      notes: observation.notes,
      photoDataUrl: observation.photoDataUrl,
      photoName: observation.photoName,
    });
    setCreating(true);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      return;
    }
    setReading(true);
    setPhotoError("");
    try {
      const dataUrl = await readImageFile(file);
      setForm((current) => ({ ...current, photoDataUrl: dataUrl, photoName: file.name }));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Could not read that image.");
    } finally {
      setReading(false);
    }
  }

  function submit() {
    const nextErrors: Partial<Record<"farmId" | "date" | "notes" | "photo", string>> = {};
    if (!form.farmId) nextErrors.farmId = "Choose a farm.";
    if (!form.date) nextErrors.date = "Enter the observation date.";
    if (!form.notes.trim()) nextErrors.notes = "Add an observation note.";
    if (!form.photoDataUrl) nextErrors.photo = "Add a crop photograph.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    saveObservation({
      id: editing?.id ?? uid(),
      farmId: form.farmId,
      seasonId: form.seasonId || null,
      date: form.date,
      notes: form.notes.trim(),
      photoDataUrl: form.photoDataUrl,
      photoName: form.photoName || "crop-photo.jpg",
      sample: editing?.sample ?? false,
    });
    setCreating(false);
    setEditing(null);
  }

  return (
    <div>
      <PageHeader
        title="Crop monitoring"
        description="Upload a field photograph, add the observation date, and keep notes against the farm and season."
        action={
          <Button onClick={openCreate} disabled={data.farms.length === 0}>
            <Plus className="h-4 w-4" />
            Add observation
          </Button>
        }
      />
      <div className="mb-4">
        <FarmFilter value={farmFilter} onChange={setFarmFilter} />
      </div>

      {data.farms.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-5 w-5" />}
          title="Register a farm first"
          body="Photographs and notes are filed under a farm so the gallery stays organised."
        />
      ) : data.observations.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-5 w-5" />}
          title="No crop observations"
          body="Upload a photograph and a short field note to start the gallery."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add observation
            </Button>
          }
        />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-5 w-5" />}
          title="No photographs for this farm"
          body="Choose another farm, or add an observation for the one selected."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add observation
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((observation) => {
            const farm = farmById(data, observation.farmId);
            const season = seasonById(data, observation.seasonId);
            return (
              <article key={observation.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
                <button className="block w-full" onClick={() => setPreview(observation)} aria-label="Open photograph">
                  <img src={observation.photoDataUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                </button>
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-forest-900">{farm?.name ?? "Farm"}</h2>
                    {observation.sample ? <SampleBadge /> : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDate(observation.date)}
                    {season ? ` · ${season.name}` : ""}
                  </p>
                  <p className="text-sm leading-6 text-slate-700">{observation.notes}</p>
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" onClick={() => openEdit(observation)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => setPendingDelete(observation)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={creating}
        title={editing ? "Edit observation" : "Add observation"}
        subtitle="Photographs are optimized and saved on this device."
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
            onChange={(event) => setForm({ ...form, farmId: event.target.value, seasonId: "" })}
          >
            <option value="">Select a farm</option>
            {data.farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Season"
            value={form.seasonId}
            onChange={(event) => setForm({ ...form, seasonId: event.target.value })}
          >
            <option value="">Not linked to a season</option>
            {seasonOptions.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Observation date"
            type="date"
            value={form.date}
            error={errors.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          <TextAreaField
            label="Notes"
            value={form.notes}
            error={errors.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="Crop stage, pests, moisture, or anything the field team should remember."
          />
          <div>
            <span className="mb-1.5 block text-sm font-medium text-forest-800">Photograph</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-mist px-4 py-6 text-sm text-forest-800 hover:border-forest-700">
              <ImagePlus className="h-4 w-4" />
              {reading ? "Preparing image…" : form.photoName ? "Replace photograph" : "Upload photograph"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </label>
            {form.photoDataUrl ? (
              <img src={form.photoDataUrl} alt="Selected crop" className="mt-3 max-h-48 w-full rounded-lg object-cover" />
            ) : null}
            {errors.photo ? <p className="mt-1 text-xs text-red-700">{errors.photo}</p> : null}
            {photoError ? <p className="mt-1 text-xs text-red-700">{photoError}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={reading}>
              {editing ? "Save changes" : "Save observation"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(preview)} title={preview ? farmById(data, preview.farmId)?.name ?? "Photograph" : "Photograph"} onClose={() => setPreview(null)} wide>
        {preview ? (
          <div>
            <img src={preview.photoDataUrl} alt="" className="max-h-[60vh] w-full rounded-xl object-contain bg-mist" />
            <p className="mt-3 text-sm text-slate-500">{formatDate(preview.date)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{preview.notes}</p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this observation?"
        body="The note and photograph will be removed from this device."
        confirmLabel="Delete observation"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteObservation(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
