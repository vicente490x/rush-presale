import { ClothingSize } from '@prisma/client';
import { z } from 'zod';

export const orderSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(120),
  size: z.nativeEnum(ClothingSize),
  quantity: z.number().int().min(1).max(100),
  terms: z.literal(true),
  turnstileToken: z.string().min(1),
  website: z.string().max(0).optional()
});
