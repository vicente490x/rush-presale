export function isMockRuntime() {
  return process.env.APP_ENV !== 'production' &&
    (process.env.RUSH_TEST_MODE === '1' || process.env.APP_ENV === 'preview');
}
