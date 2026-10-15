let testClock: (() => Date) | undefined;

export function now(): Date {
  return testClock?.() ?? new Date();
}

export function setTestClock(value?: Date | (() => Date)) {
  if (process.env.NODE_ENV !== 'test' && process.env.RUSH_TEST_MODE !== '1') {
    throw new Error('L’orologio finto è disponibile solo in ambiente di test.');
  }
  testClock = value
    ? typeof value === 'function'
      ? value
      : () => new Date(value)
    : undefined;
}
