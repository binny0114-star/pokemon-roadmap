# Third-party notices

## PKHeX-derived encounter snapshot

The scope of this notice is limited to `src/generated/modern-encounters.json`
and the PKHeX resource-decoding portions of
`scripts/generate-modern-encounters.mjs`. It does not relicense unrelated
Poké Route application code.

- Upstream project: [PKHeX](https://github.com/kwsch/PKHeX)
- Copyright: PKHeX contributors, including kwsch
- License: GNU General Public License v3.0 or later
- Pinned revision: `77dcd3a7895bceaafbbff12d25bdf77c1acd8ca5`
- License text: [`LICENSES/GPL-3.0-or-later.txt`](LICENSES/GPL-3.0-or-later.txt)
- Exact upstream inputs: the `provenance.files` array in
  `src/generated/modern-encounters.json`

The snapshot is a modified, normalized representation generated on
2026-09-12. The generator decodes selected encounter resources, replaces
upstream enum identifiers with this application's stable game IDs, preserves
source version, form, level, slot, and condition fields represented by each
decoder, and adds separately identified planner metadata. The preferred form
for modifying the covered snapshot is the generator in this repository
together with the pinned upstream files listed in the snapshot.

PKHeX and this covered derivative are provided without warranty under the
GNU General Public License v3.0 or later. Pokémon names and related trademarks
belong to their respective owners.

## PokéAPI-derived data snapshots

The normalized facts in `src/generated/species.json`,
`src/generated/learnsets.json`, `src/generated/gen67-legality.json`, and
`src/generated/gen8-legality.json`, and `src/generated/gen8-form-profiles.json` are
derived from PokéAPI CSV data pinned at revision
`3a588cf66475bd05a34aba29bd538480889829fb`. The exact input paths are listed
in each artifact's `provenance.files` array.

- Upstream project: [PokéAPI](https://github.com/PokeAPI/pokeapi)
- Copyright: © 2013–2023 Paul Hallett and PokéAPI contributors
- License: BSD 3-Clause
- License text: [`LICENSES/POKEAPI-BSD-3-CLAUSE.txt`](LICENSES/POKEAPI-BSD-3-CLAUSE.txt)

The snapshots replace upstream identifiers with stable application IDs,
normalize localized names and version boundaries, and serialize only the
fields used for data validation and planning. PokéAPI and these derivatives
are provided without warranty under the terms in the linked license.
