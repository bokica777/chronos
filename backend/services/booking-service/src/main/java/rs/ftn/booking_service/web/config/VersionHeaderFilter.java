package rs.ftn.booking_service.web.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;

// Dodaje "X-Booking-Service-Version" na svaki odgovor - jedini nacin da se
// tokom Argo Rollouts canary rollout-a spolja (npr. curl -i, ili u browser
// network tabu) vidi da li je bas dati zahtev opsluzio v1 ili v2 pod, dok
// se saobracaj postepeno preusmerava sa jedne verzije na drugu.
@Component
public class VersionHeaderFilter implements Filter {

    private final String bookingVersion;

    public VersionHeaderFilter(@Value("${booking.version}") String bookingVersion) {
        this.bookingVersion = bookingVersion;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (response instanceof HttpServletResponse httpResponse) {
            httpResponse.setHeader("X-Booking-Service-Version", bookingVersion);
        }
        chain.doFilter(request, response);
    }
}
