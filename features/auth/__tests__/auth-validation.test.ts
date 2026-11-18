import { loginSchema, registerSchema, resetSchema } from '@/lib/validations/auth';

describe('authentication validation', () => {
  it('accepts a valid login', () => {
    expect(loginSchema.safeParse({ email: 'person@example.com', password: 'longpassword' }).success).toBe(true);
  });
  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'longpassword' }).success).toBe(false);
  });
  it('requires a display name when registering', () => {
    expect(registerSchema.safeParse({ displayName: 'A', email: 'person@example.com', password: 'longpassword' }).success).toBe(false);
  });
  it('validates password reset email', () => {
    expect(resetSchema.safeParse({ email: 'person@example.com' }).success).toBe(true);
  });
});
