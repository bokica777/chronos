package rs.ftn.booking_service.web.exceptionhandlers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import rs.ftn.booking_service.domain.exceptions.BookingNotFoundException;
import rs.ftn.booking_service.domain.exceptions.BookingOverlapException;
import rs.ftn.booking_service.domain.exceptions.DuplicateBookingException;
import rs.ftn.booking_service.domain.exceptions.InvalidBookingException;
import rs.ftn.booking_service.domain.exceptions.InvalidBookingStateException;
import rs.ftn.booking_service.web.dtos.ErrorResponse;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler
{
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BookingNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(BookingNotFoundException ex){
        log.warn("Booking not found: {}", ex.getMessage());
        return  build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidBookingException.class)
    public ResponseEntity<ErrorResponse> handleInvalid(InvalidBookingException ex) {
        log.warn("Invalid booking request: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler({InvalidBookingStateException.class, DuplicateBookingException.class, BookingOverlapException.class})
    public ResponseEntity<ErrorResponse> handleConflict(RuntimeException ex) {
        log.warn("Booking conflict: {}", ex.getMessage());
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message) {
        ErrorResponse body = new ErrorResponse(message, status.value(), LocalDateTime.now());
        return ResponseEntity.status(status).body(body);
    }
}