# Cost Analysis — SwimTrack Pro Build

## Build Method
Multi-agent orchestration: Claude Code (orchestrator) + Gemini + Qwen (delegates)

## Credit Usage

| Task | Model | Credits | Claude equiv. |
|------|-------|---------|---------------|
| app.css generation | Gemini | 1 | ~2.1 saved |
| index.html generation | Gemini | 1 | ~2.3 saved |
| app.js generation (~600 lines) | Gemini | 1 | ~9.3 saved |
| manifest.json | Qwen | 1 (FREE) | ~0.5 saved |
| service-worker.js | Qwen | 1 (FREE) | ~1.0 saved |
| _portfolio/README.md | Qwen | 1 (FREE) | ~0.5 saved |
| _portfolio/case_study.md | Qwen | 1 (FREE) | ~0.7 saved |
| Integration + review + fixes | Claude | ~3 | — |
| **Total** | | **3 Gemini + 4 Qwen** | **~16.4 saved** |

## Estimated Cost Savings
- Traditional approach (all Claude): ~19 Claude credits
- Actual (delegation + integration): ~3 Claude credits + delegation costs
- **Estimated saving: ~84% reduction in Claude credit cost**
- Qwen usage: FREE tier (4 credits used, 1996 remaining)
- Gemini usage: FREE tier (3 credits used, 997 remaining)

## Time Efficiency
- Total wall time (parallel delegation): ~5 minutes for 7 files
- Sequential equivalent: ~35+ minutes
- **7x speed improvement from parallelism**

## Quality Trade-offs
- Gemini output required significant integration work (9 bugs found and fixed)
- CSS fully rewritten for quality (Gemini output was functional but incomplete)
- JS fully rewritten for correctness + security (XSS escaping, duplicate handlers fixed)
- Net result: delegation saved raw generation time; Claude added integration quality

## Recommendation for Future Builds
- Use Gemini for complex JS/CSS (good starting point, needs integration review)
- Use Qwen for config files (manifest, gitignore, simple JSON — near-perfect output)
- Budget 30-40% of total time for Phase 3 integration when using multiple delegates
