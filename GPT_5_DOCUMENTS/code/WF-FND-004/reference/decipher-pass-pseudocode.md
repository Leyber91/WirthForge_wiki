# Decipher pass pseudocode

```pseudo
function decipherPass(tokens, frameTime):
    energy = mapTokensToEnergy(tokens)
    event = {
        frame: frameTime,
        energy: energy.value,
        payload: energy.details
    }
    emit(event)
```
