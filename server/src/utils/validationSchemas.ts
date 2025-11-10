import { z } from 'zod';

// Helper for capitalizing strings
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const leadSchema = z.object({
  first_name: z.string().trim().min(2, "First name must be at least 2 characters"),
  last_name: z.string().trim().min(2, "Last name must be at least 2 characters"),
  street_address: z.string().trim().min(3, "Street address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid zip code format"),
  phone: z.string()
    .trim()
    .regex(/^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, "Invalid phone number format")
    .optional()
    .or(z.literal('')),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal('')),
  status: z.enum(['New', 'Contacted', 'Hot Lead', 'Not Interested', 'Completed']).default('New'),
  notes: z.string().trim().optional().or(z.literal('')),
}).transform(data => ({
  ...data,
  first_name: capitalize(data.first_name),
  last_name: capitalize(data.last_name),
  city: capitalize(data.city),
  state: data.state.toUpperCase(),
  phone: data.phone || null,
  email: data.email || null,
  notes: data.notes || null,
}));
