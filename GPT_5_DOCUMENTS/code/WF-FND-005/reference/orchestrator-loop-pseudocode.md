# Orchestrator loop pseudocode

```pseudo
function orchestratorLoop(emissions):
    for each frame in schedule(60Hz):
        events = collect(emissions)
        route(events)
```
