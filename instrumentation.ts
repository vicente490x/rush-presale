import { validateProductionEnv } from '@/lib/config';

export function register() {
  validateProductionEnv();
}
