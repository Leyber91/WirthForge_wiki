# Governance check pseudocode

```pseudo
function applyChange(change):
    if not passesReview(change):
        return reject("requires council approval")
    if isBreaking(change) and !hasSupermajority():
        return reject("insufficient consensus")
    merge(change)
```
