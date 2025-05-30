
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the User Agreement to create an account.",
  }),
  agreedToPrivacyPolicy: z.boolean().refine(val => val === true, {
    message: "You must agree to the Privacy Policy to create an account.",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});
