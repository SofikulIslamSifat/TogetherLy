import { z } from 'zod';
export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});
export const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});
export const resetSchema = z.object({ email: z.email('Enter a valid email address.') });
export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
