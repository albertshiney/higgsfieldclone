import "server-only"
import { higgsfield } from "@/lib/higgsfield/client"
import { sume } from "@/lib/sume/client"
import { muapi } from "@/lib/muapi/client"
export type GenerationProvider = "higgsfield" | "muapi" | "sume"
export function generationClient(provider: GenerationProvider = "higgsfield") {
  return provider === "sume"
    ? sume()
    : provider === "muapi"
      ? muapi()
      : higgsfield()
}
