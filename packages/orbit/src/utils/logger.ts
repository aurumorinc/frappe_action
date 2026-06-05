import pino from 'pino';

// Expose a global array for E2E tests to capture logs
if (typeof window !== 'undefined') {
  (window as any).__ORBIT_LOGS__ = [];
}

const logger = pino({
  level: (import.meta as any).env?.MODE === 'development' ? 'debug' : 'info',
  browser: {
    asObject: true,
    write: (o: any) => {
      // 1. Output to standard console for local debugging
      const level = o.level;
      const msg = `[Orbit] ${o.msg}`;
      
      if (level >= 50) {
        console.error(msg, o);
      } else if (level >= 40) {
        console.warn(msg, o);
      } else if (level >= 30) {
        console.info(msg, o);
      } else {
        console.debug(msg, o);
      }

      // 2. Capture logs for E2E assertions
      if (typeof window !== 'undefined' && (window as any).__ORBIT_LOGS__) {
        (window as any).__ORBIT_LOGS__.push(o);
      }

      // 3. Future hook for OpenTelemetry
      // e.g., otelLogger.emit({ body: o.msg, severityNumber: o.level, attributes: o })
    }
  }
});

export default logger;
