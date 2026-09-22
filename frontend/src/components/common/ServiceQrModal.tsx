import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { routes } from "../../app/router/routes";
import { env } from "../../config/env";
import { Button } from "./Button";

type ServiceQrModalProps = {
  serviceId: string;
  serviceName: string;
  onClose: () => void;
};

// Mali prozor sa QR kodom koji vodi na javnu stranicu usluge. Partner ga
// odstampa ili pokaze klijentu; klijent skenira, prijavi se (ako nije) i
// odmah rezervise termin na toj stranici.
export function ServiceQrModal({ serviceId, serviceName, onClose }: ServiceQrModalProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const link = `${env.publicAppUrl}${routes.serviceDetail(serviceId)}`;
  const isLocalhost = /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(link);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const canvas = canvasWrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `qr-${serviceName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.png`;
    anchor.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal qr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Zatvori">
          ×
        </button>
        <p className="eyebrow">QR kod usluge</p>
        <h3 id="qr-modal-title">{serviceName}</h3>
        <p className="qr-modal-hint">Klijent skenira kod, prijavljuje se i odmah bira termin.</p>

        <div className="qr-modal-code" ref={canvasWrapperRef}>
          <QRCodeCanvas value={link} size={220} marginSize={2} level="M" />
        </div>

        <a className="qr-modal-link" href={link} target="_blank" rel="noreferrer">
          {link}
        </a>
        {isLocalhost && (
          <p className="qr-modal-warning">
            Link vodi na localhost i neće raditi sa telefona. Za skeniranje podesi VITE_PUBLIC_APP_URL na
            adresu računara u mreži.
          </p>
        )}

        <div className="qr-modal-actions">
          <Button type="button" variant="secondary" onClick={handleCopy}>
            {copied ? "Kopirano!" : "Kopiraj link"}
          </Button>
          <Button type="button" onClick={handleDownload}>
            Preuzmi PNG
          </Button>
        </div>
      </div>
    </div>
  );
}
