export function CalendarPreview() {
  const leadingBlanks = 3;
  const days = Array.from({ length: 25 });
  const activeIndex = 6;

  return (
    <div className="calendar-preview" aria-hidden="true">
      {Array.from({ length: leadingBlanks }).map((_, index) => (
        <span key={`blank-${index}`} className="is-blank" />
      ))}
      {days.map((_, index) => (
        <span key={index} className={index === activeIndex ? "is-active" : undefined} />
      ))}
    </div>
  );
}
