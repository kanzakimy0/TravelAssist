# TASK-085 receipts

Receipts seal the input fingerprint, POI membership and every batch artifact checksum. Resume verifies the receipt and files before checksum skip. Changed sources invalidate intact receipts. A corrupted receipt fails closed; --rerun-batch N explicitly repairs only that batch.
