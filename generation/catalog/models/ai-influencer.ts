// AI Influencer character sheet — documented public REST endpoint.
// Source: https://open.higgsfield.ai/models/higgsfield/ai-influencer/api-reference
// Advanced appearance selections depend on a live options catalog and are
// omitted here; the API accepts an empty selection and generates a character.
import { compact, first, promptText, urls } from "../mappers"
import type { ModelEntry } from "../types"

const model: ModelEntry = {
  id: "ai-influencer",
  surface: "image",
  family: "Higgsfield",
  provider: "Higgsfield",
  icon: "higgsfield",
  label: "AI Influencer",
  description:
    "Create a two-view character sheet for a human or animal from a brief and optional photo references.",
  bestFor: "Consistent character references",
  badges: ["NEW"],
  category: "CHARACTER",
  roles: { start: 1, reference: 3 },
  roleLabels: { start: "Identity photo", reference: "Clothing or item reference" },
  maxPromptLength: 4000,
  settings: {
    tier: {
      type: "enum",
      values: [
        "normal", "freak", "total", "insects", "frogs", "cats",
        "dogs", "capybaras", "birds",
      ],
      default: "normal",
      label: "Character type",
      labels: {
        normal: "Natural human",
        freak: "Bold human",
        total: "Extreme human",
        insects: "Insect",
        frogs: "Frog",
        cats: "Cat",
        dogs: "Dog",
        capybaras: "Capybara",
        birds: "Bird",
      },
    },
  },
  order: 35,
  docs: ["https://open.higgsfield.ai/models/higgsfield/ai-influencer/api-reference"],
  toPlatform: (plane) => {
    const items = urls(plane, "reference")
    return {
      path: "higgsfield/ai-influencer",
      body: compact({
        tier: plane.settings.tier,
        brief: promptText(plane),
        image_url: first(plane, "start"),
        item_image_urls: items.length ? items : undefined,
      }),
    }
  },
}

const models = [model]
export default models
