import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly duration: Histogram<string>;
  private readonly counter: Counter<string>;

  constructor() {
    this.duration = this.getOrCreateHistogram();
    this.counter = this.getOrCreateCounter();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const route = request.route?.path || context.getClass().name;
    const start = process.hrtime.bigint();

    const observe = (status: number) => {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = { method, route, status: String(status) };
      this.counter.inc(labels);
      this.duration.observe(labels, elapsed);
    };

    return next.handle().pipe(
      tap(() => observe(response.statusCode ?? 200)),
      catchError((error) => {
        observe(error?.status ?? response.statusCode ?? 500);
        throw error;
      }),
    );
  }

  private getOrCreateHistogram() {
    const existing = register.getSingleMetric('http_request_duration_seconds') as Histogram<string> | undefined;
    if (existing) return existing;
    return new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    });
  }

  private getOrCreateCounter() {
    const existing = register.getSingleMetric('http_requests_total') as Counter<string> | undefined;
    if (existing) return existing;
    return new Counter({
      name: 'http_requests_total',
      help: 'Count of HTTP requests received',
      labelNames: ['method', 'route', 'status'],
    });
  }
}
