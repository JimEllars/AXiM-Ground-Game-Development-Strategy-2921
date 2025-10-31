import { z } from 'zod';

export const leadSchema = z.object({
  street_address: z.string().min(1, { message: "Street address is required" }),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});
