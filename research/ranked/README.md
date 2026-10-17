# Public ranked statistics collection · 2026-10-17

This import adds published aggregates, not individual ranked match histories.

| Collection | Rows | Cohorts | Coverage |
| --- | ---: | ---: | --- |
| Chinese server archives | 32,343 | 412 | S24, S26, S28, S32–40, S43, S44; available daily, weekly and cumulative periods |
| Asia S43 hunter transcription | 324 | 9 | 36 hunters, all ranks / tiers 1–7 / peak tier 7 |
| Global S42 survivor transcription | 50 | 1 | Peak tier 7; Asia versus NA/EU is not established |
| Chinese knowledge-score snapshots | 1,384 | 2 | 2026-06-13 and 2026-08-04; rank positions and scores, no player identities |

44,989 candidate ranked rows yielded 32,717 distinct published rows after removing 12,272 duplicate records. Different periods are retained as separate cohorts even when their underlying matches overlap. Do not sum or average them.

`normalized-inputs.json.gz` preserves the normalized research input, original metric precision, source names, original URLs and metadata. `source-manifest.json` records retrieved archive URLs, fixed Git commit IDs and raw-file hashes. `character-map-cn.json` maps Chinese names and game IDs to existing MANOR IDs. `validation-cn.json` records the independent collection checks.

Run `python scripts/build-ranked.py` to reproduce `dist/ranked/`. The published index contains cohort metadata; the app loads a server/season payload only when selected. `statistics.zip` contains the complete ranked CSV, knowledge-score CSV and source/cohort metadata. Unknown values remain empty/null, not zero.

## Definitions and limitations

- Chinese pick and ban values are within-faction selection shares; they are not directly comparable with the tournament per-match appearance or ban percentages.
- Chinese loss percentages are calculated as 100 − win − draw. No sample size or confidence interval is inferred.
- The Asia transcription contains both wins over all results and a draw-excluded adjusted win rate. Only the former is used as `win`; the latter is retained in the input snapshot only.
- Source archives were accessed; current official service responses and every original image were not independently verified.
- Chinese S44 2026-08-04 snapshots are outside the date interval named in the source's error notice, but correction status could not be confirmed. They remain accessible as `needs-review` and are excluded from automatic default selection. This is not a claim that the snapshots are definitely incorrect.
- Missing characters in specific source snapshots remain absent. The latest Chinese snapshots do not contain Prodigy or Beast of the Mind. Some earlier cohorts have additional documented omissions.
- Latest Asia survivor data, NA/EU raw tables, Korean-only statistics, ranked match histories, and map/persona aggregates could not be obtained through the available public retrieval paths. Dynamic public interfaces advertised some of these views but did not expose their numeric contents to the available retrieval tools. They were not fabricated.

The original character prose and the user's Google text-editing sheet are unchanged.
