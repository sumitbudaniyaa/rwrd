import { z } from 'zod';

export const CreateLeadSchema = z.object({
  contactName: z.string().trim().min(2, 'Name is required').max(255),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().min(10, 'Valid phone number is required').max(20),
  restaurantName: z.string().trim().min(2, 'Restaurant name is required').max(255),
  city: z.string().trim().min(2, 'City is required').max(100),
  notes: z.string().max(1000).optional(),
  turnstileToken: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const LeadResponseSchema = z.object({
  id: z.string().uuid(),
  contactName: z.string(),
  restaurantName: z.string(),
  status: z.enum(['new', 'contacted', 'demo_scheduled', 'won', 'lost']),
  createdAt: z.string().datetime(),
});

export type LeadResponse = z.infer<typeof LeadResponseSchema>;
