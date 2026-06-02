import { defineEnv } from "@howells/envy";
import { z } from "zod";

export const envSchema = defineEnv({
  server: {
    VERCEL_TOKEN: z.string().min(1),
  },
});
