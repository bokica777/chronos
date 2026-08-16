import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../../components/common/Button";
import { LeafletMap } from "../../components/common/LeafletMap";
import { LocationPickerMap } from "../../components/common/LocationPickerMap";
import { PageHeader } from "../../components/common/PageHeader";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import type { Provider, UpdateProviderRequest } from "../../models/provider";
import { providerService } from "../../services/providerService";
import { resolveImageUrl } from "../../utils/media";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PencilIcon() {
  return (
    <svg {...iconProps} width={20} height={20}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...iconProps} width={20} height={20}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function StorefrontIcon() {
  return (
    <svg {...iconProps} width={36} height={36}>
      <path d="M4 9.5 5.2 4h13.6l1.2 5.5" />
      <path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5.5 11v9h13v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

type FormState = {
  name: string;
  description: string;
  aboutUs: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string;
  contactEmail: string;
  workingHoursStart: string;
  workingHoursEnd: string;
};

function toFormState(provider: Provider): FormState {
  return {
    name: provider.name,
    description: provider.description ?? "",
    aboutUs: provider.aboutUs ?? "",
    address: provider.address ?? "",
    latitude: provider.latitude ?? null,
    longitude: provider.longitude ?? null,
    contactPhone: provider.contactPhone ?? "",
    contactEmail: provider.contactEmail ?? "",
    workingHoursStart: provider.workingHoursStart ?? "",
    workingHoursEnd: provider.workingHoursEnd ?? "",
  };
}

export function ProfilePage() {
  useDocumentTitle("Profil");

  const [provider, setProvider] = useState<Provider | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    providerService
      .getMine(controller.signal)
      .then((result) => {
        setProvider(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });

    return () => controller.abort();
  }, []);

  // Poruka o uspesnom cuvanju nestaje sama posle 2 sekunde.
  useEffect(() => {
    if (!savedMessage) return;
    const timeout = setTimeout(() => setSavedMessage(null), 2000);
    return () => clearTimeout(timeout);
  }, [savedMessage]);

  const startEditing = () => {
    if (!provider) return;
    setForm(toFormState(provider));
    setErrorMessage(null);
    setSavedMessage(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setForm(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !provider) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSavedMessage(null);

    try {
      const request: UpdateProviderRequest = {
        name: form.name,
        description: form.description,
        aboutUs: form.aboutUs,
        imageUrl: provider.imageUrl,
        address: form.address,
        latitude: form.latitude,
        longitude: form.longitude,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        workingHoursStart: form.workingHoursStart,
        workingHoursEnd: form.workingHoursEnd,
      };
      const updated = await providerService.updateMine(request);
      setProvider(updated);
      setSavedMessage("Profil je sačuvan.");
      setIsEditing(false);
      setForm(null);
    } catch {
      setErrorMessage("Čuvanje profila nije uspelo. Proveri podatke i pokušaj ponovo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingImage(true);
    setErrorMessage(null);
    try {
      const updated = await providerService.uploadImage(file);
      setProvider(updated);
    } catch {
      setErrorMessage("Otpremanje slike nije uspelo. Podržani formati: jpg, png, webp, gif (do 5MB).");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!provider) return;
    try {
      const updated = await providerService.setVisibility(!provider.isActive);
      setProvider(updated);
    } catch {
      setErrorMessage("Promena vidljivosti nije uspela. Pokušaj ponovo.");
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Da li sigurno želiš da obrišeš profil? Ova akcija je trajna i briše i sve tvoje usluge."
    );
    if (!confirmed) return;

    try {
      await providerService.deleteMine();
      window.location.href = "/";
    } catch {
      setErrorMessage("Brisanje profila nije uspelo. Pokušaj ponovo.");
    }
  };

  if (status === "loading") {
    return <div className="loading-spinner" />;
  }

  if (status === "error" || !provider) {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo tvoj profil. Pokušaj ponovo malo kasnije.</p>
      </div>
    );
  }

  const hasLocation = typeof provider.latitude === "number" && typeof provider.longitude === "number";

  return (
    <>
      <PageHeader
        eyebrow="Partner"
        title="Profil"
        description="Pregledaj i uredi svoj javni profil."
        className="page-header--centered"
      />

      {savedMessage && <p className="profile-toast">{savedMessage}</p>}

      <div className="card profile-card">
        <button
          type="button"
          className="profile-card-edit-toggle"
          onClick={isEditing ? cancelEditing : startEditing}
          aria-label={isEditing ? "Otkaži izmene" : "Izmeni profil"}
          title={isEditing ? "Otkaži izmene" : "Izmeni profil"}
        >
          {isEditing ? <CloseIcon /> : <PencilIcon />}
        </button>

        {errorMessage && <p className="form-error">{errorMessage}</p>}

        {!isEditing ? (
          <>
            <div className="profile-card-header">
              <div className="profile-card-avatar">
                {provider.imageUrl ? (
                  <img src={resolveImageUrl(provider.imageUrl)} alt={provider.name} />
                ) : (
                  <div className="provider-card-placeholder">
                    <StorefrontIcon />
                  </div>
                )}
              </div>
              <div className="profile-card-heading">
                <h1>{provider.name}</h1>
                <span className={`visibility-badge visibility-badge--${provider.isActive ? "visible" : "hidden"}`}>
                  {provider.isActive ? "Vidljivo klijentima" : "Sakriveno od klijenata"}
                </span>
              </div>
            </div>

            <div className="profile-view-fields">
              <div className="profile-view-field">
                <h3>Opis</h3>
                <p>{provider.description || "Nije uneto."}</p>
              </div>
              <div className="profile-view-field">
                <h3>O nama</h3>
                <p>{provider.aboutUs || "Nije uneto."}</p>
              </div>
              <div className="profile-view-field">
                <h3>Adresa</h3>
                <p>{provider.address || "Nije uneto."}</p>
              </div>
              {hasLocation && (
                <div className="profile-view-field">
                  <h3>Lokacija na mapi</h3>
                  <LeafletMap
                    latitude={provider.latitude as number}
                    longitude={provider.longitude as number}
                    label={provider.name}
                  />
                </div>
              )}
              <div className="profile-view-field">
                <h3>Telefon</h3>
                <p>{provider.contactPhone || "Nije uneto."}</p>
              </div>
              <div className="profile-view-field">
                <h3>Kontakt email</h3>
                <p>{provider.contactEmail || "Nije uneto."}</p>
              </div>
              <div className="profile-view-field">
                <h3>Radno vreme</h3>
                <p>
                  {provider.workingHoursStart && provider.workingHoursEnd
                    ? `${provider.workingHoursStart} - ${provider.workingHoursEnd}`
                    : "Nije uneto."}
                </p>
              </div>
            </div>
          </>
        ) : (
          form && (
            <form className="form-stack" onSubmit={handleSubmit}>
              <div className="profile-image-upload">
                <div className="profile-card-avatar">
                  {provider.imageUrl ? (
                    <img src={provider.imageUrl} alt={provider.name} />
                  ) : (
                    <div className="provider-card-placeholder">
                      <StorefrontIcon />
                    </div>
                  )}
                </div>
                <label className="button button--secondary">
                  {isUploadingImage ? "Otpremanje..." : "Promeni sliku"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageChange}
                    disabled={isUploadingImage}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <label>
                Naziv
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Opis (delatnost)
                <input
                  type="text"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              <label>
                O nama
                <input
                  type="text"
                  value={form.aboutUs}
                  onChange={(event) => setForm({ ...form, aboutUs: event.target.value })}
                />
              </label>
              <label>
                Adresa
                <input
                  type="text"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </label>

              <div>
                <label>Lokacija</label>
                <LocationPickerMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChange={(latitude, longitude) => setForm({ ...form, latitude, longitude })}
                />
              </div>

              <label>
                Telefon
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
                />
              </label>
              <label>
                Kontakt email
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                />
              </label>
              <div className="profile-form-row">
                <label>
                  Radno vreme od
                  <input
                    type="time"
                    value={form.workingHoursStart}
                    onChange={(event) => setForm({ ...form, workingHoursStart: event.target.value })}
                  />
                </label>
                <label>
                  Radno vreme do
                  <input
                    type="time"
                    value={form.workingHoursEnd}
                    onChange={(event) => setForm({ ...form, workingHoursEnd: event.target.value })}
                  />
                </label>
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Čuvanje..." : "Sačuvaj izmene"}
              </Button>

              <div className="profile-card-danger-zone">
                <Button type="button" variant="secondary" onClick={handleToggleVisibility}>
                  {provider.isActive ? "Ugasi vidljivost" : "Upali vidljivost"}
                </Button>
                <Button type="button" variant="danger" onClick={handleDelete}>
                  Obriši profil
                </Button>
              </div>
            </form>
          )
        )}
      </div>
    </>
  );
}
