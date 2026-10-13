export function logError(event: string, error: unknown) {
  console.error(JSON.stringify({ level: 'error', event, error: error instanceof Error ? error.name : 'unknown' }));
}

export function logInfo(event: string) {
  console.info(JSON.stringify({ level: 'info', event }));
}
