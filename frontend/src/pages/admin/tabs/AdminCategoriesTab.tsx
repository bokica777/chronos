import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../../../components/common/Button";
import type { Category, CreateCategoryRequest } from "../../../models/category";
import { adminService } from "../../../services/adminService";
import { categoryService } from "../../../services/categoryService";
import { resolveImageUrl } from "../../../utils/media";

const emptyForm: CreateCategoryRequest = { name: "", iconUrl: "" };

export function AdminCategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [form, setForm] = useState<CreateCategoryRequest>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIconUrl, setEditingIconUrl] = useState<string | undefined>(undefined);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (iconPreview) URL.revokeObjectURL(iconPreview);
    };
  }, [iconPreview]);

  const load = (signal?: AbortSignal) =>
    adminService.categories
      .getAll(signal)
      .then((result) => {
        setCategories(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!signal?.aborted) setStatus("error");
      });

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({ name: category.name, iconUrl: category.iconUrl ?? "" });
    setEditingIconUrl(category.iconUrl);
    setIconFile(null);
    setIconPreview(null);
    setErrorMessage(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditingIconUrl(undefined);
    setIconFile(null);
    setIconPreview(null);
    setErrorMessage(null);
  };

  const handleIconFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      let saved = editingId
        ? await categoryService.update(editingId, form)
        : await categoryService.create(form);

      if (iconFile) {
        saved = await categoryService.uploadImage(saved.id, iconFile);
      }

      setCategories((current) => {
        const exists = current.some((category) => category.id === saved.id);
        return exists
          ? current.map((category) => (category.id === saved.id ? saved : category))
          : [...current, saved];
      });
      resetForm();
    } catch {
      setErrorMessage("Čuvanje kategorije nije uspelo. Proveri podatke i pokušaj ponovo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (category: Category) => {
    setPendingId(category.id);
    try {
      const updated = await adminService.categories.setVisibility(category.id, !category.isActive);
      setCategories((current) => current.map((item) => (item.id === category.id ? updated : item)));
    } catch {
      window.alert("Promena vidljivosti kategorije nije uspela.");
    } finally {
      setPendingId(null);
    }
  };

  if (status === "loading") return <div className="loading-spinner" />;
  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo kategorije.</p>
      </div>
    );
  }

  const displayIconUrl = iconPreview ?? (editingIconUrl ? resolveImageUrl(editingIconUrl) : undefined);

  return (
    <>
      <form className="form-stack service-form" onSubmit={handleSubmit}>
        {errorMessage && <p className="form-error">{errorMessage}</p>}
        <label>
          Naziv kategorije
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </label>
        <div className="service-form-image">
          <div className="service-manage-media service-form-image-preview">
            {displayIconUrl ? (
              <img src={displayIconUrl} alt="" />
            ) : (
              <div className="service-manage-media-placeholder" aria-hidden="true" />
            )}
          </div>
          <label className="button button--secondary">
            {iconFile ? "Ikonica izabrana" : "Dodaj ikonicu"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={handleIconFileChange}
              style={{ display: "none" }}
            />
          </label>
        </div>
        <div className="hero-actions">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Čuvanje..." : editingId ? "Sačuvaj izmene" : "Dodaj kategoriju"}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Otkaži izmenu
            </Button>
          )}
        </div>
      </form>

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>Nema definisanih kategorija.</p>
        </div>
      ) : (
        <ul className="service-manage-list">
          {categories.map((category) => (
            <li key={category.id} className="card service-manage-row">
              <div className="service-manage-media">
                {category.iconUrl && <img src={resolveImageUrl(category.iconUrl)} alt="" />}
              </div>
              <div className="service-manage-info">
                <h3>{category.name}</h3>
                <span className={`visibility-badge visibility-badge--${category.isActive ? "visible" : "hidden"}`}>
                  {category.isActive ? "Vidljivo" : "Skriveno"}
                </span>
              </div>
              <div className="service-manage-actions">
                <Button type="button" variant="secondary" onClick={() => handleEdit(category)}>
                  Izmeni
                </Button>
                <Button
                  type="button"
                  variant={category.isActive ? "danger" : "secondary"}
                  disabled={pendingId === category.id}
                  onClick={() => handleToggleVisibility(category)}
                >
                  {category.isActive ? "Sakrij" : "Prikaži"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
