using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Observability;

public static class ServiceTelemetry
{
    public const string SourceName = "Chronos";
    public static readonly ActivitySource ActivitySource = new(SourceName);
    public static readonly Meter Meter = new(SourceName);
    public static readonly Counter<long> Requests = Meter.CreateCounter<long>(
        "chronos_requests_total",
        description: "Number of handled business requests.");
    public static readonly Counter<long> Failures = Meter.CreateCounter<long>(
        "chronos_failures_total",
        description: "Number of failed business operations.");
    public static readonly Histogram<double> Duration = Meter.CreateHistogram<double>(
        "chronos_operation_duration_ms",
        unit: "ms",
        description: "Duration of business operations.");
}
