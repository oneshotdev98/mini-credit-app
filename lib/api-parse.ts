import { z } from "zod";

export function zodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request body.";
}
