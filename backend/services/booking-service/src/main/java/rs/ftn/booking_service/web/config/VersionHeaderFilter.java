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
