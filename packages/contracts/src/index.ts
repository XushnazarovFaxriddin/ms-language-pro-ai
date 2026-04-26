// Shared TS types + Zod schemas matching docs/api-contracts.md.
// As FastAPI services stabilize, generate from OpenAPI via `pnpm contracts:generate`.

import { z } from "zod";

export const LocaleSchema = z.enum(["uz", "en"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const RoleSchema = z.enum([
  "student",
  "examiner",
  "content_admin",
  "researcher",
  "superadmin",
]);
export type Role = z.infer<typeof RoleSchema>;

export const SkillSchema = z.enum(["listening", "reading", "writing", "speaking"]);
export type Skill = z.infer<typeof SkillSchema>;

export const CefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export type CefrLevel = z.infer<typeof CefrLevelSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  roles: z.array(RoleSchema),
  locale: LocaleSchema,
  created_at: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  user: UserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RegisterRequestSchema = LoginRequestSchema.extend({
  display_name: z.string().nullable().optional(),
  locale: LocaleSchema.default("uz"),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// Problem Details (RFC 9457)
export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  request_id: z.string().optional(),
  errors: z.array(z.record(z.unknown())).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
