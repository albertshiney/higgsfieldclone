# Vireo model catalog

## 2026-10-30 discovery refresh

The [current documentation index](https://docs.higgsfield.ai/docs/llms.txt)
now directs model discovery to the [console model list](https://open.higgsfield.ai/explore)
and each model's own API page. The September 26 inventory below is a snapshot,
not a complete statement of today's public API. The following models were
found in the October refresh; unresolved workflows stay out of the picker:

| Model | Surface | Console endpoint(s) seen | Status |
|---|---|---|---|
| [Kling 4.0](https://open.higgsfield.ai/models/kling-video/v4.0/text-to-video/api-reference) | Video | `kling-video/v4.0/{text-to-video,image-to-video,reference-to-video,video-edit}` | Live in picker; all four mappers verified against the console API pages. Pricing uses the public maximum per second until account-specific prices are synced. |
| [Genjutsu Light](https://open.higgsfield.ai/models/higgsfield/genjutsu-light/motion-transfer/v1.0/playground) | Video | `higgsfield/genjutsu-light/{motion-transfer,object-swap}/v1.0` | Live basic one-image flows; the model-specific reference limits remain unclear. Shared auth docs and v2 playground examples take precedence over a conflicting generic API reference. |
| [AI Influencer](https://open.higgsfield.ai/models/higgsfield/ai-influencer/api-reference) | Image | `higgsfield/ai-influencer` | Live in picker: type, brief, identity photo and three item references. Advanced appearance selections are not exposed yet. |
| [Ads Studio](https://open.higgsfield.ai/explore) | Image workflow | Console lists it, but a complete endpoint contract has not been checked | Unverified |

The console has public starting prices, but account-specific pricing and access
remain unverified without the owner's login. No new model is enabled on the
strength of a listing alone.

Source of truth for which Higgsfield models Vireo exposes, where each one's REST
contract comes from, and why anything is left out.

- **Researched:** 2026-09-26, against `https://docs.higgsfield.ai/docs/llms.txt`,
  the two category pages (`/docs/models/image-generation`, `/docs/models/video-generation`)
  and every workflow page they link (81 pages crawled; digest kept in
  `_reference/docs/digest.md`). The docs state the catalog covers **82 entries
  listed for sale as of 2026-09-22: 16 image and 66 video**.
- **Precedence:** live docs win for API behavior; the template
  (`higgsfield-ai/app-templates`, commit `b29cdab`) wins for UI patterns. Every
  disagreement is listed in `docs/decisions.md` §"Docs vs template".
- **Price source:** the console price list needs an account login we don't have.
  The docs document `POST /estimate/{endpoint}` (billing-and-retention), so
  prices are filled by `pnpm pricing:sync`, which calls the estimate endpoint
  for every row below and writes `lib/billing/pricing.generated.json`.
  Token-metered endpoints return a pricing description instead; those rules
  are derived from its text (`source: "description"`). Anything else keeps a
  flagged placeholder (`source: "placeholder"`), which the live API never
  sells until an admin prices it (see `docs/runbook.md` → Pricing).

Status legend: **Live** = documented REST endpoint, wired into the picker ·
**Unverified** = seen in the template/CLI/site but not in the REST docs, kept out
of the picker · **Not in API** = exists only in Higgsfield's own app or agent/CLI
API, not the public REST API · **v2** = documented but deliberately out of scope
for v1 (§13 of the brief).

## Image (13 picker entries → 17 endpoints)

| Picker id | Label | REST path(s) | Inputs / modes | Settings (UI → API) | Status |
|---|---|---|---|---|---|
| `ai-influencer` | AI Influencer | `higgsfield/ai-influencer` | optional character brief; one identity photo → `image_url`; up to three item images → `item_image_urls` | human/animal type → `tier`; fixed 2K 16:9 output | Live ([API page](https://open.higgsfield.ai/models/higgsfield/ai-influencer/api-reference)); advanced `selection` options pending |
| `soul-2` | Soul 2 | `higgsfield-ai/soul/v2/standard` | prompt only | aspect 9:16·16:9·4:3·3:4·1:1·2:3·3:2 (1:1) → `aspect_ratio`; resolution 720p·1080p → `resolution`; batch 1·4 → `batch_size`; enhance → `enhance_prompt` | Live |
| `soul-2-edit` | Soul 2 Edit | `higgsfield-ai/soul/v2/image-to-image` | prompt + required reference photo → `image_url` | aspect; 720p·1080p; batch 1·4; reference enhancement always on | Live ([API page](https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/image-to-image/api-reference)) |
| `soul-cinema` | Soul Cinema | `higgsfield-ai/soul/cinema` | prompt only | same as Soul 2 (fixed style) | Live (docs note: may be hidden from discovery, callable directly) |
| `soul` | Soul | `higgsfield-ai/soul/standard` | prompt; optional 1 reference image → `image_reference_url` | aspect (4:3 default); resolution; batch 1·4; enhance | Live |
| `marketing-image-flare` | Marketing Image 2.5 Flare | `marketing-studio/image/flare` | prompt; 0–16 reference images → `image_urls` | quality low·medium·high·xhigh·max (high); resolution 1k·2k·4k (2k); aspect auto·1:1·3:2·2:3·4:3·3:4·16:9·9:16·21:9 (auto) | Live |
| `marketing-image-sunburst` | Marketing Image 2.5 Sunburst | `marketing-studio/image/sunburst` | as Flare | as Flare | Live |
| `marketing-image-2` | Marketing Image 2.0 | `marketing-studio/image` | as Flare | quality low·medium·high | Live |
| `grok-image-2` | Grok Image 2.0 | `xai/grok-imagine-image-2.0` | prompt; 0–10 reference images → `image_urls` (edit) | quality low·medium; resolution 1k·2k; aspect auto + 9 ratios | Live |
| `recraft-4.1` | Recraft V4.1 | `recraft/v4.1/text-to-image` · `recraft/v4.1/pro/text-to-image` · `recraft/v4.1/utility/text-to-image` · `recraft/v4.1/utility/pro/text-to-image` | prompt only | style standard·utility × resolution 1k·2k picks the path; aspect (14 ratios); format jpg·png·webp | Live (4 endpoints, 1 entry) |
| `qwen-image-3` | Qwen Image 3 | `alibaba/qwen-image-3/text-to-image` · `alibaba/qwen-image-3/edit` | prompt; 0 refs → text-to-image, 1–3 refs → edit | resolution 1k·2k; aspect (10); prompt extend; thinking (requires extend) | Live |
| `ideogram-4` | Ideogram 4.0 | `ideogram/v4.0` | prompt (2–2048 chars); optional 1 reference → `image_url` + `image_weight` | aspect (23); rendering speed TURBO·DEFAULT·QUALITY; image weight 1–100 (only with a reference) | Live |
| `z-image-turbo` | Z-Image Turbo | `z-image/turbo` | prompt (≤800 chars) | resolution 1k·2k; aspect (10); prompt extend | Live |

## Video (31 picker entries → 72 endpoints)

Generator tabs: **Create** (text/frames/references), **Edit** (a source video is
required), **Motion** (motion transfer / motion control).

| Picker id | Tab | Label | REST path(s) | Inputs / modes | Key settings | Status |
|---|---|---|---|---|---|---|
| `kling-4` | Create | Kling 4.0 | `kling-video/v4.0/{text-to-video,image-to-video,reference-to-video}` | text; first frame + ≤8 ordered middle frames + optional end; or ≤10 image and ≤5 video references | duration 3–30; 720p·1080p; aspect 21:9·16:9·9:16·1:1 (plus adaptive for references) | Live ([text](https://open.higgsfield.ai/models/kling-video/v4.0/text-to-video/api-reference), [image](https://open.higgsfield.ai/models/kling-video/v4.0/image-to-video/api-reference), [references](https://open.higgsfield.ai/models/kling-video/v4.0/reference-to-video/api-reference)) |
| `kling-4-edit` | Edit | Kling 4.0 Edit | `kling-video/v4.0/video-edit` | source video required; ≤10 image and ≤5 video references | prompt required; duration 3–30; 720p·1080p; aspect including adaptive | Live ([API page](https://open.higgsfield.ai/models/kling-video/v4.0/video-edit/api-reference)) |
| `genjutsu-light-motion` / `-swap` | Motion / Edit | Genjutsu Light | `higgsfield/genjutsu-light/{motion-transfer,object-swap}/v1.0` | source video ≥4 s + one image; first 15 s used | 480p·720p·1080p; optional prompt; billed by output duration | Live basic flow ([motion](https://open.higgsfield.ai/models/higgsfield/genjutsu-light/motion-transfer/v1.0/playground), [swap](https://open.higgsfield.ai/models/higgsfield/genjutsu-light/object-swap/v1.0/playground)) |
| `seedance-2.5` | Create | Seedance 2.5 | `bytedance/seedance-2.5/{text-to-video,image-to-video,reference-to-video}` | frames (start → `image_url`, end → `end_image_url`) **or** references (≤30 img, ≤10 video, ≤10 audio, ≤50 total) | aspect (6, t2v/r2v only); duration 4–30; resolution 480p·720p; audio; bitrate standard·high | Live |
| `seedance-2.5-edit` | Edit | Seedance 2.5 Edit | `bytedance/seedance-2.5/video-edit` | source video (required) + ≤9 video refs, ≤30 img, ≤10 audio; prompt required | resolution; audio; bitrate (no duration) | Live |
| `seedance-2.5-extend` | Edit | Seedance 2.5 Extend | `bytedance/seedance-2.5/video-extend` | as Edit | duration 4–30; resolution; audio; bitrate | Live |
| `seedance-2` | Create | Seedance 2.0 | `bytedance/seedance-2.0/{text-to-video,image-to-video,reference-to-video}` | frames **or** references (≤9 img, ≤3 video, ≤3 audio; audio alone not enough) | aspect; duration 4–15; resolution 480p·720p·1080p·4k; audio | Live |
| `kling-3-turbo` | Create | Kling 3.0 Turbo | `kling-video/v3.0-turbo/{text-to-video,image-to-video}` | text or start frame | aspect (t2v); duration 3–15; resolution 720p·1080p | Live |
| `kling-3-std` | Create | Kling 3.0 | `kling-video/v3.0/std/{text-to-video,image-to-video}` | text or start (+ optional end → `last_image_url`) | aspect (t2v); duration 3–15; sound on·off; cfg 0–1; multi-shot | Live |
| `kling-3-pro` | Create | Kling 3.0 Pro | `kling-video/v3.0/pro/{…}` | as above | as above | Live |
| `kling-3-4k` | Create | Kling 3.0 4K | `kling-video/v3.0/4k/{…}` | as above | as above | Live |
| `kling-3-motion-std` / `-pro` | Motion | Kling 3.0 Motion Control | `kling-video/v3/motion-control/{std,pro}` | character image (required) + motion video (required, 3–30 s) | keep sound yes·no; orientation image·video | Live |
| `kling-2.6` | Create | Kling 2.6 | `kling-video/v2.6/pro/{text-to-video,image-to-video}` | text or start frame | aspect; duration 5·10; sound; cfg | Live |
| `kling-2.6-motion-std` / `-pro` | Motion | Kling 2.6 Motion Control | `kling-video/motion-control/{std,pro}` | image + video (both required) | keep sound; orientation | Live (new vs template) |
| `kling-2.5-turbo` | Create | Kling 2.5 Turbo Pro | `kling-video/v2.5-turbo/pro/{text-to-video,image-to-video}` | text or start frame | duration 5·10; cfg; (no sound/aspect) | Live |
| `kling-2.5-turbo-std` | Create | Kling 2.5 Turbo | `kling-video/v2.5-turbo/standard/image-to-video` | start frame required | duration 5·10; cfg | Live |
| `kling-o3` | Create | Kling O3 | `kling-video/o3/{first-last-frame,image-reference}` | frames (first/last) **or** image references (+ optional frames) | mode std·pro·4k; duration 3–15; sound (off); aspect | Live |
| `kling-o3-edit` | Edit | Kling O3 Edit | `kling-video/o3/video-edit` | source video (3–15.5 s) + ≤4 images | mode std·pro·4k | Live |
| `kling-o3-video-ref` | Create | Kling O3 Video Reference | `kling-video/o3/video-reference` | 1 video reference + ≤4 images | mode std·pro; duration 3–10; aspect | Live |
| `kling-omni` | Create | Kling Omni | `kling-video/omni/{first-last-frame,image-reference}` | start frame (required for frames) **or** image references | mode std·pro; duration 5·10 (frames) / 3–10 (refs); aspect | Live |
| `kling-omni-edit` | Edit | Kling Omni Edit | `kling-video/omni/video-edit` | source video (3–10 s) + ≤4 images | mode | Live |
| `kling-omni-video-ref` | Create | Kling Omni Video Reference | `kling-video/omni/video-reference` | 1 video ref + ≤4 images | mode; duration 3–10; aspect | Live |
| `happy-horse-1` / `happy-horse-1.1` | Create | Happy Horse 1.0 / 1.1 | `alibaba/happy-horse[/v1.1]/{text-to-video,image-to-video,reference-to-video}` | text, start frame, or 1–9 image refs | aspect (t2v); duration 2/3–15; resolution 720p·1080p | Live |
| `wan-3` / `wan-3-prime` | Create | Wan 3.0 / 3.0 Prime | `alibaba/wan-3.0[-prime]/{text-to-video,image-to-video,reference-to-video}` | text, frames (start+end), or refs (≤10 img, ≤5 video, ≤5 audio) | aspect incl. adaptive; duration 2–30; resolution 480p·720p·1080p; audio; thinking | Live |
| `cinema-studio-4` | Create | Cinema Studio 4.0 | `higgsfield/cinema-studio/4.0` | prompt; optional refs ≤30 img, ≤10 video, ≤10 audio | duration 4–30; resolution 480p·720p; aspect; audio; genre, era, light, pacing, lens, camera, aperture, movement, palette (each "Auto" = omitted) | Live |
| `ltx-2.5-fast` / `ltx-2.5-pro` | Create | LTX-2.5 Fast / Pro | `lightricks/ltx-2.5/{text-to-video,image-to-video}/{fast,pro}` | text or start (+ optional end → `end_image_url`) | duration 6·8·10; resolution (fast up to 4k, pro ≤1080p); fps; aspect 16:9·9:16; audio; camera movement | Live |
| `minimax-h3` | Create | MiniMax H3 | `minimax/h3/{text-to-video,image-to-video,reference-to-video}` | text, frames, or refs (1–9 img / 1–3 video, ≤3 audio only alongside) | duration 5–15; aspect incl. auto/adaptive; resolution fixed `2K` | Live |
| `hailuo-2.3` | Create | Hailuo 2.3 | `minimax/hailuo-2.3/standard/{text-to-video,image-to-video}` | text or start frame | duration 6·10; prompt optimizer (fixed 768p) | Live |
| `pixverse-v6` | Create | PixVerse V6 | `pixverse/v6/{text-to-video,image-to-video}` | text or start (+ end) | duration 1–15; resolution 360p–1080p; aspect (t2v); audio | Live |
| `wan-2.6` | Create | Wan 2.6 | `wan/v2.6/{text-to-video,image-to-video,reference-to-video}` | text, start frame, or 1–3 video refs; optional driving audio (t2v/i2v) | duration 5·10·15 (refs 5·10); resolution; multi-shot; prompt extend; aspect (refs only) | Live |
| `wan-2.7` | Create | Wan 2.7 | `wan/v2.7/{text-to-video,image-to-video,reference-to-video}` | text, frames, or refs (≤5 image+video); optional driving audio | duration 2–15 (refs 2–10); resolution; aspect | Live |
| `grok-video-1.5` | Create | Grok Imagine Video 1.5 | `xai/grok-imagine-video/v1.5/reference-to-video` | text, one start frame (`image_url`), or refs (≤7 images, ≤1 audio) — never both | duration 1–15; resolution 480p·720p·1080p (1080p text/frame only); aspect | Live |
| `genjutsu-motion` | Motion | Genjutsu Motion Transfer | `higgsfield/genjutsu/motion-transfer/v1.0` | source video (≥4 s) + 1–8 images; prompt optional | resolution 720p·480p | Live |
| `genjutsu-swap` | Edit | Genjutsu Object Swap | `higgsfield/genjutsu/object-swap/v1.0` | source video (≥4 s, ≥409,600 px/frame) + 1–8 images | resolution | Live |

## Audio (0 picker entries)

The REST docs list no audio-generation endpoint (their catalog is 16 image + 66
video). The status/webhook schemas *do* define `audio`/`audios` outputs, so the
surface is fully wired (catalog type, prompt dock, audio tile/player, R2 copy,
pricing) and a test fixture model exercises it end to end, but the **Audio nav
item and `/audio` route stay hidden until an audio model file exists**. Adding
one is a single file in `generation/catalog/models/` + `pnpm models`.

| Model | Where it exists | Status |
|---|---|---|
| Seed Audio 1.0 | Higgsfield CLI / agent API (`seed_audio`) | Not in API |
| Sonilo Music | CLI (`sonilo_music`) | Not in API |
| Mirelo Text to Audio | CLI (`mirelo_text_to_audio`) | Not in API |
| Text-to-speech (Inworld and others) | Higgsfield web app | Not in API |

## Unverified (in the template or on the site, absent from the REST docs)

| Model | Seen in | Path claimed | Why excluded |
|---|---|---|---|
| Flux 2 (image) | template `flux-2.ts` | `flux-2-pro` | Not in the 16-entry image catalog |
| Flux 3 (video) | template `flux-3.ts` | `blackforestlabs/flux-3/text-to-video` | Not in the 66-entry video catalog |
| Higgsfield DoP | template `dop.ts` | `higgsfield-ai/dop/lite` | Not in the video catalog |
| Seedance 2.0 Fast / Mini | template `seedance-2.ts` | `bytedance/seedance-2.0/{fast,mini}` | Docs list only the 3 base Seedance 2.0 workflows |

## Not in API (Higgsfield web app / CLI only)

Nano Banana / 2 / 2 Lite / Pro · GPT Image 1.5 / 2 / 2.5 (the REST equivalent of
the 2.5 Flare/Sunburst variants is *Marketing Studio Image*, which is Live) ·
Seedream 4.5 / 5.0 Lite · Flux Kontext Max · Kling O1 Image · Soul Cast · Soul
Location · Cinema Studio Image 2.5 · Cinema Studio Video 2/3 (REST has **4.0**,
which is Live) · Marketing Studio Video · Google Veo 3 / 3.1 / 3.1 Lite · Gemini
Omni Flash · Seedance 1.5 Pro · upscale / outpaint / background removal · Virality
Predictor · Multi-image to 3D · all audio models above.

## v2 (documented, out of scope for v1)

| Model | REST | Note |
|---|---|---|
| Soul ID (character training) | `POST /v1/custom-references`, `GET /v1/custom-references/{id}` | Extension point: `characters` collection + `custom_reference_id` on Soul entries |
| Marketing Studio `enhance_prompt` | requires `preset_id` from `GET /marketing-studio/image/presets` | v1 sends `enhance_prompt: false` |
| Kling `elements`, `multi_prompt` | per-account element ids / custom shots | v1 sends single-shot requests; `multi_shots` toggle keeps the top-level duration |
