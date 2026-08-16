import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../../components/common/Button";
import { PageHeader } from "../../components/common/PageHeader";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import type { Category } from "../../models/category";
import type { CreateServiceRequest, Service } from "../../models/service";
import { categoryService } from "../../services/categoryService";
import { serviceCatalogService } from "../../services/serviceCatalogService";
import { resolveImageUrl } from "../../utils/media";

function PlusIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const emptyForm: CreateServiceRequest = {
  categoryId: "",
  name: "",
  description: "",
  note: "",
  durationMinutes: 30,
  price: 0,
};

export function ManageServicesPage() {
  useDocumentTitle("Menadžer usluga");

  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [form, setForm] = useState<CreateServiceRequest>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      categoryService.getAll(controller.signal),
      serviceCatalogService.getMine(controller.signal),
    ])
      .then(([categoriesResult, servicesResult]) => {
        setCategories(categoriesResult);
        setServices(servicesResult);
        setForm((current) => ({ ...current, categoryId: current.categoryId || categoriesResult[0]?.id || "" }));
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });

    return () => controller.abort();
  }, []);

  // Oslobodi prethodni object URL kad se izabere nova slika ili se komponenta unmount-uje.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const closeForm = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setEditingId(null);
    setEditingImageUrl(undefined);
    setImageFile(null);
    setImagePreview(null);
    setIsFormOpen(false);
  };

  const startCreating = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setEditingId(null);
    setEditingImageUrl(undefined);
    setImageFile(null);
    setImagePreview(null);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setEditingImageUrl(service.imageUrl);
    setImageFile(null);
    setImagePreview(null);
    setErrorMessage(null);
    setForm({
      categoryId: service.categoryId,
      name: service.name,
      description: service.description ?? "",
      note: service.note ?? "",
      durationMinutes: service.durationMinutes,
      price: service.price,
    });
    setIsFormOpen(true);
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Obrisati ovu uslugu?")) return;
    await serviceCatalogService.remove(id);
    setServices((current) => current.filter((service) => service.id !== id));
    if (editingId === id) closeForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      let saved = editingId
        ? await serviceCatalogService.update(editingId, form)
        : await serviceCatalogService.create(form);

      if (imageFile) {
        saved = await serviceCatalogService.uploadImage(saved.id, imageFile);
      }

      setServices((current) => {
        const exists = current.some((service) => service.id === saved.id);
        return exists
          ? current.map((service) => (service.id === saved.id ? saved : service))
          : [...current, saved];
      });
      closeForm();
    } catch {
      setErrorMessage("Čuvanje usluge nije uspelo. Proveri podatke i pokušaj ponovo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") {
    return <div className="loading-spinner" />;
  }

  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo tvoje usluge. Pokušaj ponovo malo kasnije.</p>
      </div>
    );
  }

  const displayImageUrl = imagePreview ?? (editingImageUrl ? resolveImageUrl(editingImageUrl) : undefined);

  return (
    <>
      <PageHeader
        eyebrow="Partner"
        title="Menadžer usluga"
        description="Dodaj, izmeni ili obriši usluge koje nudiš."
      />

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>Nema još definisanih kategorija — obrati se administratoru.</p>
        </div>
      ) : (
        <>
          {!isFormOpen && (
            <div className="service-form-toggle">
              <Button type="button" onClick={startCreating}>
                <PlusIcon /> Dodaj uslugu
              </Button>
            </div>
          )}

          {isFormOpen && (
            <form className="form-stack service-form" onSubmit={handleSubmit}>
              {errorMessage && <p className="form-error">{errorMessage}</p>}

              <div className="service-form-image">
                <div className="service-manage-media service-form-image-preview">
                  {displayImageUrl ? (
                    <img src={displayImageUrl} alt="" />
                  ) : (
                    <div className="service-manage-media-placeholder" aria-hidden="true" />
                  )}
                </div>
                <label className="button button--secondary">
                  {imageFile ? "Slika izabrana" : "Dodaj sliku"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageFileChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <label>
                Kategorija
                <select
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Naziv usluge
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Opis
                <input
                  type="text"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              <label>
                Napomena
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                />
              </label>
              <div className="profile-form-row">
                <label>
                  Trajanje (minuti)
                  <input
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })}
                    required
                  />
                </label>
                <label>
                  Cena (RSD)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: Number(event.target.value) })}
                    required
                  />
                </label>
              </div>
              <div className="hero-actions">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Čuvanje..." : editingId ? "Sačuvaj izmene" : "Dodaj uslugu"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeForm}>
                  {editingId ? "Otkaži izmenu" : "Zatvori"}
                </Button>
              </div>
            </form>
          )}
        </>
      )}

      {services.length === 0 ? (
        <div className="empty-state">
          <p>Još uvek nemaš dodatih usluga.</p>
        </div>
      ) : (
        <ul className="service-manage-list">
          {services.map((service) => {
            const category = categories.find((item) => item.id === service.categoryId);
            return (
              <li key={service.id} className="card service-manage-row">
                <div className="service-manage-media">
                  {service.imageUrl ? (
                    <img src={resolveImageUrl(service.imageUrl)} alt={service.name} />
                  ) : (
                    <div className="service-manage-media-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="service-manage-info">
                  <div className="service-manage-category">
                    {category?.iconUrl && <img src={category.iconUrl} alt="" className="service-category-icon" />}
                    <p className="eyebrow">{category?.name ?? "Bez kategorije"}</p>
                  </div>
                  <h3>{service.name}</h3>
                  {service.description && <p>{service.description}</p>}
                  {service.note && <p className="service-manage-note">{service.note}</p>}
                  <p className="service-manage-meta">
                    {service.durationMinutes} min · {service.price} RSD
                  </p>
                </div>
                <div className="service-manage-actions">
                  <Button type="button" variant="secondary" onClick={() => handleEdit(service)}>
                    Izmeni
                  </Button>
                  <Button type="button" variant="danger" onClick={() => handleDelete(service.id)}>
                    Obriši
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
