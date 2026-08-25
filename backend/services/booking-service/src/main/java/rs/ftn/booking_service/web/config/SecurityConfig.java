package rs.ftn.booking_service.web.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;

// Booking-service nezavisno proverava JWT token isim deljenim HMAC kljucem
// koji koriste auth-service (izdaje token) i provider-service (vec ga proverava
// na isti nacin) - nema poziva ka auth-service-u pri svakom zahtevu.
@Configuration
public class SecurityConfig {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.issuer}")
    private String jwtIssuer;

    @Value("${jwt.audience}")
    private String jwtAudience;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/**").permitAll()
                        // Javni kalendar dostupnosti - gost mora da vidi zauzete termine i bez prijave.
                        .requestMatchers("/api/v1/bookings/provider/**").permitAll()
                        // Admin pregled svih rezervacija na platformi.
                        .requestMatchers("/api/v1/bookings/admin/**").hasRole("Admin")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
                        .decoder(jwtDecoder)
                        .jwtAuthenticationConverter(jwtAuthenticationConverter())
                ));
        return http.build();
    }

    // ASP.NET (auth-service) upisuje ulogu pod dugim ClaimTypes.Role URI-jem, ne pod
    // kratkim "role" - zato citamo bas taj kljuc i mapiramo ga u Spring "ROLE_x" autoritet
    // da bi .hasRole(...) mogao da radi deklarativno umesto rucne provere u kontroleru.
    private static final String ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        return jwt -> {
            String role = jwt.getClaimAsString(ROLE_CLAIM);
            Collection<GrantedAuthority> authorities = role == null
                    ? List.of()
                    : List.of(new SimpleGrantedAuthority("ROLE_" + role));
            return new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken(jwt, authorities);
        };
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        SecretKeySpec secretKey = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                issuerValidator(),
                audienceValidator()
        ));
        return decoder;
    }

    private OAuth2TokenValidator<Jwt> issuerValidator() {
        return jwt -> {
            String issuer = jwt.getClaimAsString(JwtClaimNames.ISS);
            if (jwtIssuer.equals(issuer)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_issuer", "Token issuer nije ispravan.", null));
        };
    }

    private OAuth2TokenValidator<Jwt> audienceValidator() {
        return jwt -> {
            if (jwt.getAudience() != null && jwt.getAudience().contains(jwtAudience)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_audience", "Token audience nije ispravan.", null));
        };
    }
}
