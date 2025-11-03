import { z } from 'zod';

export const leadSchema = z.object({
  street_address: z.string().trim().min(1, { message: "Street address is required" }),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zip: z.string().regex(/^\d{5}(?:[-\s]\d{4})?$/, { message: "Invalid zip code" }).optional(),
  phone: z.string().regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, { message: "Invalid phone number" }).optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  status: z.enum(['New', 'Contacted', 'Hot Lead', 'Not Interested', 'Completed']).optional(),
  notes: z.string().trim().optional(),
}).transform(data => ({
  ...data,
  first_name: data.first_name || null,
  last_name: data.last_name || null,
  city: data.city || null,
  state: data.state || null,
  zip: data.zip || null,
  phone: data.phone || null,
  email: data.email || null,
  status: data.status || 'New',
  notes: data.notes || null,
}));
