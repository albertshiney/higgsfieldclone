# Studio components (from the Higgsfield app template)

Import these; do not fork or hand-roll replacements. Missing a prop? Extend
the component here, backward compatible.

- **`PromptBox`** (`prompt-box.tsx`): composition primitive
  (`Root / ModeRail / Mode / Body / Field / Actions / Pill / Uploads / Upload /
  Generate`). **`StudioPromptBox`** is the prop-driven dock used by the image
  generator; `modelSlot` swaps in the model picker, `extraActions` adds pills.
- **`AssetLibraryModal`** behind every "+" / add-media action: Uploads tab plus
  image/video/audio tabs. Enforces per-kind limits from catalog capacities.
- **`SettingsDialog`** renders every `model.settings` field (enum → Select,
  range → Slider, boolean → switch). Add settings in the model file, not here.
- **`UserGenerations`** is the only feed of a user's generations (virtualized
  justified rows). Pass `actions` (hover rail + lightbox buttons) or
  `selection` (multi-select). `gallery/` is its private internals.
- **`GenerationTile` / `CardActions`** (`generation-card.tsx`) and
  **`GenerationDetailModal`** (lightbox) render one generation.
- **`ScreenEmptyState`**, **`ProjectCreateModal` / `ProjectActions`**.

Design invariants: dark only; lime `bg-primary`/`bg-lime` is reserved for the
Generate CTA and active states; icons are `lucide-react`; every visible
control works end to end.

Dialog entry controls use `DialogTrigger` from `components/ui/dialog.tsx`. It keeps server-rendered triggers disabled until client handlers are ready. Preserve existing render-trigger props and layouts.
