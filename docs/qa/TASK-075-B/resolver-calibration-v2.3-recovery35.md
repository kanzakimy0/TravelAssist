# TASK-075-B Resolver Calibration v2.2

- Target pool: 12647
- Tuning: 600; development: 300; final blind: 300
- Development gate: **PASS**
- Final blind gate: **PASS**
- Overall gate: **PASS**

## Micro counts

```json
{
  "tuning": {
    "counts": {
      "candidateGenerationHitAt1Count": 65,
      "candidateGenerationHitAt5Count": 150,
      "candidateGenerationHitAt20Count": 153,
      "candidateGenerationHitAt50Count": 153,
      "top1CorrectCount": 131,
      "evaluatedCount": 153,
      "high": {
        "correct": 80,
        "predicted": 80
      },
      "medium": {
        "correct": 0,
        "predicted": 0
      },
      "provisional": {
        "correct": 21,
        "predicted": 23
      },
      "hardConflictAutoMatch": 0
    },
    "rates": {
      "candidateGenerationRecallAt1": 0.42483660130718953,
      "candidateGenerationRecallAt5": 0.9803921568627451,
      "candidateGenerationRecallAt20": 1,
      "candidateGenerationRecallAt50": 1,
      "top1Accuracy": 0.8562091503267973,
      "highPrecision": 1,
      "mediumPrecision": 1,
      "provisionalPrecision": 0.9130434782608695
    }
  },
  "development": {
    "counts": {
      "candidateGenerationHitAt1Count": 0,
      "candidateGenerationHitAt5Count": 260,
      "candidateGenerationHitAt20Count": 260,
      "candidateGenerationHitAt50Count": 260,
      "top1CorrectCount": 258,
      "evaluatedCount": 260,
      "high": {
        "correct": 257,
        "predicted": 257
      },
      "medium": {
        "correct": 0,
        "predicted": 0
      },
      "provisional": {
        "correct": 1,
        "predicted": 1
      },
      "hardConflictAutoMatch": 0
    },
    "rates": {
      "candidateGenerationRecallAt1": 0,
      "candidateGenerationRecallAt5": 1,
      "candidateGenerationRecallAt20": 1,
      "candidateGenerationRecallAt50": 1,
      "top1Accuracy": 0.9923076923076923,
      "highPrecision": 1,
      "mediumPrecision": 1,
      "provisionalPrecision": 1
    }
  },
  "finalBlind": {
    "counts": {
      "candidateGenerationHitAt1Count": 0,
      "candidateGenerationHitAt5Count": 260,
      "candidateGenerationHitAt20Count": 260,
      "candidateGenerationHitAt50Count": 260,
      "top1CorrectCount": 260,
      "evaluatedCount": 260,
      "high": {
        "correct": 260,
        "predicted": 260
      },
      "medium": {
        "correct": 0,
        "predicted": 0
      },
      "provisional": {
        "correct": 0,
        "predicted": 0
      },
      "hardConflictAutoMatch": 0
    },
    "rates": {
      "candidateGenerationRecallAt1": 0,
      "candidateGenerationRecallAt5": 1,
      "candidateGenerationRecallAt20": 1,
      "candidateGenerationRecallAt50": 1,
      "top1Accuracy": 1,
      "highPrecision": 1,
      "mediumPrecision": 1,
      "provisionalPrecision": 1
    }
  }
}
```

## Development miss taxonomy

{}
