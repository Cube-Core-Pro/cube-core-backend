// path: backend/src/observability/otel.ts
// purpose: Initialize OpenTelemetry (traces) for Fortune 500 observability

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const OTEL_ENABLED = process.env.OTEL_ENABLED !== 'false';

let sdk: NodeSDK | null = null;

export function initOtel() {
  if (!OTEL_ENABLED || sdk) return; // no-op if disabled or already initialized

  const serviceName = process.env.OTEL_SERVICE_NAME || 'cube-core-backend';
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  const traceExporter = new OTLPTraceExporter({
    url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
    headers: undefined,
  });

  sdk = new NodeSDK({
    traceExporter,
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    sdk.start();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[otel] failed to start', err);
  }

  const shutdown = async () => {
    if (!sdk) return;
    try { await sdk.shutdown(); } catch (e) { /* ignore */ }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Auto-init on import
initOtel();

