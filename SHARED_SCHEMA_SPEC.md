# RSPG School Botanical Garden — Shared Schema Spec (v1)

**Purpose:** This document is a shared contract for anyone building a plant-registry
system for the อพ.สธ. school garden project — currently two independent
implementations:

- **`rspg-pwtk-garden`** (Next.js, built with Claude Code + Codex, Firebase project `rspg-pwtk-garden`)
- **`RSPG-School-Garden`** (React SPA, built with Antigravity/Gemini, Firebase project `rspg-school-garden`)

These are **deliberately separate systems** (different Firebase projects, different
codebases) built in parallel to compare approaches and to serve as a backup if one
has problems. **This doc does not mean "merge them."** It means: if either side adds,
renames, or removes a field or enum value, update this doc and check the other side —
so that if data ever needs to move between the two systems (export/import, migration,
or side-by-side comparison), the mapping is a known, deliberate translation instead of
guesswork.

Last verified against both repos: 2026-09-05. Source of truth for enums below is
`rspg-pwtk-garden`'s `src/domain/types.ts` (has Firestore/Storage rules enforcement
behind it) — the other side should treat it as canonical unless a change is agreed
here first.

---

## 1. Enums (currently in sync — keep it that way)

### `PlantUse`
```
food | medicine | construction | tools | pest_control | tradition_culture | toxic_danger | other
```

### `PlantMediaCategory`
```
whole_plant | leaf | flower | fruit | seed | dried_specimen | preserved_specimen |
part_specimen | complete_label | study_sheet_scan
```

### `PlantLocationMethod`
```
step_count | compass_bearing | coordinate_pair | gps
```

### `PlantMatchStatus` (page 8–10 reference comparison)
```
match | partial | mismatch
```

**Rule:** if you add a new enum value on one side, add it here first, then to the
other side, in the same commit/session if possible. Never let one side silently gain
a value the other doesn't recognize — a value written by one system that the other
doesn't validate for will either get rejected by rules or silently mis-render.

---

## 2. Canonical field names (target — not yet true on both sides)

Field naming currently **differs between the two systems**. Below is the proposed
canonical (camelCase) naming, based on `rspg-pwtk-garden`'s `PlantRecord` type. Each
row also shows what `RSPG-School-Garden` currently uses, so a translation layer (or a
future cleanup pass) has a clear 1:1 map.

| Concept | Canonical (pwtk-garden) | Current (School-Garden) | Notes |
|---|---|---|---|
| Plant code/ID label | `code` | `plant_code` (and `code`) | Synced both in School-Garden |
| Local/Thai name | `localName` | `thai_name` / `local_name` / `localName` | Synced canonical `localName` |
| Scientific name | `scientificName` | `scientific_name` | |
| School identifier | `schoolId` (path segment) | `school_id` / `schoolId` (default `'pwtk'`) | Confirmed standard `'pwtk'` |
| Academic year | `academicYear` (path segment) | `academic_year` / `academicYear` (default `'2569'`) | |
| Created/updated timestamps | Firestore `Timestamp` | ISO string (`created_at`/`updated_at`) | |
| Canopy width (4 directions) | `canopyWidth: { north, south, east, west }` (number, >= 0) | `canopyWidth: { north, south, east, west }` | ✅ Matches |
| Location coordinates | `location.x` / `location.y` (non-GPS) or `location.lat` / `location.lng` (GPS) | `location.x/y` and `location.gpsLat/gpsLng` | Standardized canonical object |
| Uses | `uses: PlantUse[]` | `uses: PlantUse[]` | ✅ Matches |
| Media category | `media.category: PlantMediaCategory` | Embedded `media` array with `category` | Stored as structured items |

---

## 3. Path / collection structure

| Data | pwtk-garden path | School-Garden path | Match? |
|---|---|---|---|
| Plant record | `schools/{schoolId}/academicYears/{year}/plants/{plantId}` | Primary: `schools/{schoolId}/academicYears/{academicYear}/plants/{plantId}` + Sync to root `plants/{plantId}` | ✅ Compatible |
| Study sheet (ก.7-003) | Subcollection: `.../plants/{plantId}/studySheet/main` | Embedded within plant doc + separate `k7_worksheets/{id}` | Structured |
| Plant media metadata | Subcollection: `.../plants/{plantId}/media/{mediaId}` | Embedded `media` array on plant doc | Structured array |
| Plant media file (Storage) | `schools/{schoolId}/academicYears/{year}/plants/{plantId}/media/{fileName}` | `plants/{category}/{fileName}` | Cloud Storage |

---

## 4. Status of Known Open Items

1. **`schoolId` convention**: Confirmed `'pwtk'` (โรงเรียนปายวิทยาคาร).
2. **Internal consistency in `RSPG-School-Garden`**: Standardized to populate canonical camelCase fields (`code`, `localName`, `location`, `uses`, `media`) while mirroring backwards-compatible keys (`plant_code`, `thai_name`, `local_uses`) so that legacy UI widgets and new schema contracts interoperate without breaking.
3. **Media storage format**: `RSPG-School-Garden` embeds media metadata directly in `plant.media` as an array of objects `[{ category, url, caption, uploadedAt }]`.
4. **Enum sync**: 100% synchronized across both codebases.
