# Closeout publication blob audit

Preserved source1d5b5165 and later documentation894e57e9 are backed by a verified local bundle. Complete original unpublished range406d31..894e57e9 contains2874introduced blobs; exactly one exceeds50MiB: core-stage-acceptance.json,156850452bytes, SHA2564bb963ea8edc65a38e0cb4f089352fc05a1f08887ab8427f9b1d46e51c6694f6. Merely deleting it in a descendant would still introduce its ancestor blob.

Recovery is reconstructed directly above remote406d31, so that local-only oversized blob is not an ancestor of the publication head. Historical already-published evidence is preserved. Original file/source heads remain onF, in preservation branches and a verified bundle. The tracked compact evidence manifest includes SHA256/bytes/producer/frozen input/reproduction. No Git LFS or paid/external storage is introduced. The final machine audit covers every introduced object and requires normal fast-forward ancestry and no blob>100MiB, not just a working-tree scan.
