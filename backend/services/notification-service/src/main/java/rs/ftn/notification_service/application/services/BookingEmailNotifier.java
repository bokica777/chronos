package rs.ftn.notification_service.application.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;
import rs.ftn.notification_service.infrastructure.http.AuthServiceClient;
import rs.ftn.notification_service.infrastructure.http.AuthServiceClient.UserContact;
import rs.ftn.notification_service.infrastructure.http.ProviderServiceClient;
import rs.ftn.notification_service.infrastructure.http.ProviderServiceClient.ProviderLookup;
import rs.ftn.notification_service.infrastructure.http.ProviderServiceClient.ServiceLookup;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

// Sastavlja i salje mejlove vezane za rezervaciju, obema stranama:
//  - nova rezervacija: kupcu potvrda sa osnovnim podacima, partneru podaci o kupcu;
//  - placena rezervacija: kupcu potvrda uplate, partneru obavestenje da je placeno.
// Podatke koje dogadjaj ne nosi (ime/mejl/telefon kupca, naziv usluge, podaci
// partnera) dohvata od auth-service-a i provider-service-a. Ako neki poziv ne
// uspe, mejl se ipak salje sa onim sto je poznato ("-" za nedostajuce).
@Component
public class BookingEmailNotifier {

    private static final Logger log = LoggerFactory.getLogger(BookingEmailNotifier.class);
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy. 'u' HH:mm");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final Locale SERBIAN = Locale.forLanguageTag("sr-Latn-RS");

    private final EmailService emailService;
    private final AuthServiceClient authServiceClient;
    private final ProviderServiceClient providerServiceClient;
    private final String frontendUrl;

    public BookingEmailNotifier(EmailService emailService,
                                AuthServiceClient authServiceClient,
                                ProviderServiceClient providerServiceClient,
                                @Value("${notifications.frontend-url}") String frontendUrl) {
        this.emailService = emailService;
        this.authServiceClient = authServiceClient;
        this.providerServiceClient = providerServiceClient;
        this.frontendUrl = frontendUrl;
    }

    public void bookingCreated(UUID bookingId, UUID customerId, UUID providerId, UUID serviceId,
                               LocalDateTime startTime, LocalDateTime endTime, double price) {
        Details d = load(customerId, providerId, serviceId);
        if (d == null) {
            return;
        }
        String term = formatTerm(startTime, endTime);

        Map<String, String> customerRows = new LinkedHashMap<>();
        customerRows.put("Usluga", d.serviceName());
        customerRows.put("Partner", d.providerName());
        customerRows.put("Adresa", d.providerAddress());
        customerRows.put("Termin", term);
        customerRows.put("Cena", formatPrice(price));
        customerRows.put("Plaćanje", "Nije plaćeno – možete platiti u sekciji „Moje rezervacije”");
        customerRows.put("Broj rezervacije", shortId(bookingId));
        emailService.send(d.customerEmail(),
                "Rezervacija potvrđena – " + d.serviceName(),
                layout("Rezervacija je uspešna",
                        "Zdravo " + escape(d.customerName()) + ", vaša rezervacija je uspešno kreirana i potvrđena.",
                        customerRows,
                        link("/bookings", "Pogledaj moje rezervacije")));

        Map<String, String> providerRows = new LinkedHashMap<>();
        providerRows.put("Klijent", d.customerName());
        providerRows.put("Email klijenta", d.customerEmail());
        providerRows.put("Telefon klijenta", d.customerPhone());
        providerRows.put("Usluga", d.serviceName());
        providerRows.put("Termin", term);
        providerRows.put("Cena", formatPrice(price));
        providerRows.put("Status", "Potvrđena (još nije plaćena)");
        providerRows.put("Broj rezervacije", shortId(bookingId));
        emailService.send(d.providerEmail(),
                "Nova rezervacija – " + d.serviceName() + ", " + startTime.format(DATE_TIME),
                layout("Imate novu rezervaciju",
                        "Klijent " + escape(d.customerName()) + " je rezervisao termin kod vas. Rezervacija je potvrđena.",
                        providerRows,
                        link("/manage/services", "Otvori Chronos")));
    }

    public void paymentConfirmed(UUID bookingId, UUID customerId, UUID providerId, UUID serviceId,
                                 LocalDateTime startTime, Double price) {
        Details d = load(customerId, providerId, serviceId);
        if (d == null) {
            return;
        }
        String term = startTime == null ? "-" : startTime.format(DATE_TIME);
        String amount = price == null ? "-" : formatPrice(price);

        Map<String, String> customerRows = new LinkedHashMap<>();
        customerRows.put("Usluga", d.serviceName());
        customerRows.put("Partner", d.providerName());
        customerRows.put("Termin", term);
        customerRows.put("Plaćeni iznos", amount);
        customerRows.put("Status", "Plaćeno");
        customerRows.put("Broj rezervacije", shortId(bookingId));
        emailService.send(d.customerEmail(),
                "Plaćanje uspešno – " + d.serviceName(),
                layout("Uplata je primljena",
                        "Zdravo " + escape(d.customerName()) + ", uplata za vašu rezervaciju je uspešno izvršena. Vidimo se!",
                        customerRows,
                        link("/bookings", "Pogledaj moje rezervacije")));

        Map<String, String> providerRows = new LinkedHashMap<>();
        providerRows.put("Klijent", d.customerName());
        providerRows.put("Email klijenta", d.customerEmail());
        providerRows.put("Telefon klijenta", d.customerPhone());
        providerRows.put("Usluga", d.serviceName());
        providerRows.put("Termin", term);
        providerRows.put("Iznos", amount);
        providerRows.put("Broj rezervacije", shortId(bookingId));
        emailService.send(d.providerEmail(),
                "Rezervacija plaćena – " + d.serviceName(),
                layout("Rezervacija je plaćena",
                        "Klijent " + escape(d.customerName()) + " je platio rezervaciju.",
                        providerRows,
                        link("/manage/services", "Otvori Chronos")));
    }

    private Details load(UUID customerId, UUID providerId, UUID serviceId) {
        if (!emailService.isEnabled()) {
            log.info("Email sending is disabled - skipping booking emails (customer {}, provider {}).",
                    customerId, providerId);
            return null;
        }
        UserContact customer = authServiceClient.findUser(customerId);
        ProviderLookup provider = providerServiceClient.findProvider(providerId);
        ServiceLookup service = providerServiceClient.findService(serviceId);

        if (customer == null) {
            log.warn("Customer {} not found - customer email will be skipped.", customerId);
        }
        if (provider == null || provider.contactEmail() == null || provider.contactEmail().isBlank()) {
            log.warn("Provider {} not found or has no contact email - provider email will be skipped.", providerId);
        }

        return new Details(
                customer == null ? null : customer.email(),
                customer == null ? "-" : orDash(customer.displayName()),
                customer == null ? "-" : orDash(customer.phoneNumber()),
                provider == null ? null : provider.contactEmail(),
                provider == null ? "-" : orDash(provider.name()),
                provider == null ? "-" : orDash(provider.address()),
                service == null ? "usluga" : orDash(service.name()));
    }

    private record Details(String customerEmail, String customerName, String customerPhone,
                           String providerEmail, String providerName, String providerAddress,
                           String serviceName) {
    }

    // Jednostavan HTML sa inline stilovima (mejl klijenti ne podrzavaju <style> pouzdano).
    private String layout(String title, String intro, Map<String, String> rows, String action) {
        StringBuilder table = new StringBuilder();
        rows.forEach((label, value) -> table
                .append("<tr><td style=\"padding:8px 12px;color:#6b7280;white-space:nowrap;\">")
                .append(escape(label))
                .append("</td><td style=\"padding:8px 12px;color:#111827;font-weight:600;\">")
                .append(escape(value == null ? "-" : value))
                .append("</td></tr>"));

        return "<div style=\"font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;\">"
                + "<div style=\"max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;\">"
                + "<div style=\"background:#4f46e5;color:#ffffff;padding:20px 24px;font-size:20px;font-weight:700;\">Chronos</div>"
                + "<div style=\"padding:24px;\">"
                + "<h2 style=\"margin:0 0 12px;color:#111827;font-size:18px;\">" + escape(title) + "</h2>"
                + "<p style=\"margin:0 0 16px;color:#374151;line-height:1.5;\">" + intro + "</p>"
                + "<table style=\"width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;\">"
                + table + "</table>"
                + action
                + "</div>"
                + "<div style=\"padding:12px 24px;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;\">"
                + "Ovaj mejl je automatski poslat iz aplikacije Chronos. Nemojte odgovarati na njega.</div>"
                + "</div></div>";
    }

    private String link(String path, String label) {
        return "<p style=\"margin:20px 0 0;\"><a href=\"" + escape(frontendUrl + path) + "\" "
                + "style=\"display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;"
                + "padding:10px 18px;border-radius:8px;font-weight:600;\">" + escape(label) + "</a></p>";
    }

    private static String formatTerm(LocalDateTime start, LocalDateTime end) {
        if (start == null) {
            return "-";
        }
        return end == null ? start.format(DATE_TIME) : start.format(DATE_TIME) + " – " + end.format(TIME);
    }

    private static String formatPrice(double price) {
        return String.format(SERBIAN, "%,.2f RSD", price);
    }

    private static String shortId(UUID id) {
        return id == null ? "-" : id.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private static String orDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private static String escape(String value) {
        return value == null ? "" : HtmlUtils.htmlEscape(value, "UTF-8");
    }
}
