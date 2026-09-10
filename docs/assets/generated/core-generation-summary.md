# Japan-only core generation summary

| Metric                          | Value   |
| ------------------------------- | ------- |
| status                          | Partial |
| japan_seed_destinations         | 300     |
| non_JP_rows                     | 0       |
| verified_prefecture_assignments | 124     |
| missing_prefectures             | 0       |
| unresolved_destination_entities | 300     |
| unresolved_attraction_slots     | 9000    |
| sources                         | 9300    |
| variants                        | 9600    |
| batches                         | 40      |
| physical_image_files            | 0       |
| execution_allowed               | false   |

300 frozen seed destinations are planning identities, not 300 fully resolved production entities. 9,000 slots are explicitly unresolved, not verified attractions. Original images/parent registries are unchanged. Existing parent manifest has 194 assets; none is converted from a symbolic asset request into a POI.

Prefecture names and URLs were checked against [JNTO destinations](https://www.japan.travel/en/destinations/). Names, exact cluster boundaries, center coordinates and translations still need review. No provider IDs or prices were fabricated.
