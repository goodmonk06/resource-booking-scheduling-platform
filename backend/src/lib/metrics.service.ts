import { Injectable } from '@nestjs/common';

interface MetricLabels {
  [key: string]: string | number;
}

interface CounterMetric {
  name: string;
  value: number;
  labels: MetricLabels;
  timestamp: Date;
}

interface GaugeMetric {
  name: string;
  value: number;
  labels: MetricLabels;
  timestamp: Date;
}

interface HistogramMetric {
  name: string;
  value: number;
  labels: MetricLabels;
  timestamp: Date;
}

@Injectable()
export class MetricsService {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment a counter metric
   * Use for: number of requests, bookings created, errors, etc.
   */
  incrementCounter(name: string, labels?: MetricLabels, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.logMetric('counter', { name, value: current + value, labels, timestamp: new Date() });
  }

  /**
   * Set a gauge metric
   * Use for: active connections, queue depth, cache size, etc.
   */
  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);

    this.logMetric('gauge', { name, value, labels, timestamp: new Date() });
  }

  /**
   * Record a histogram value (for latency, duration, etc.)
   * Use for: request duration, query time, processing time
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = this.getMetricKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    this.logMetric('histogram', { name, value, labels, timestamp: new Date() });
  }

  /**
   * Record timing of an operation
   */
  recordTiming(name: string, durationMs: number, labels?: MetricLabels): void {
    this.recordHistogram(`${name}.duration_ms`, durationMs, labels);
  }

  /**
   * Measure and record execution time of a function
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: MetricLabels,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.recordTiming(name, duration, { ...labels, status: 'success' });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordTiming(name, duration, { ...labels, status: 'error' });
      throw error;
    }
  }

  /**
   * Get current metrics snapshot (for /metrics endpoint)
   */
  getMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { count: number; sum: number; avg: number }>;
  } {
    const histogramStats: Record<string, { count: number; sum: number; avg: number }> = {};

    for (const [key, values] of this.histograms.entries()) {
      const sum = values.reduce((a, b) => a + b, 0);
      histogramStats[key] = {
        count: values.length,
        sum,
        avg: sum / values.length,
      };
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats,
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private getMetricKey(name: string, labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `${name}{${labelStr}}`;
  }

  private logMetric(
    type: 'counter' | 'gauge' | 'histogram',
    metric: CounterMetric | GaugeMetric | HistogramMetric,
  ): void {
    // In production, this would export to Prometheus, DataDog, CloudWatch, etc.
    // For now, just structured logging
    if (process.env.LOG_METRICS === 'true') {
      console.log(
        JSON.stringify({
          metricType: type,
          ...metric,
        }),
      );
    }
  }
}
