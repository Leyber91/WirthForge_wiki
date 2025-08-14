# WF-TECH-002 – CLI and Snippet References

## CLI Usage

Run the helper script to convert token timing to energy units:

```bash
python code/WF-TECH-002/token_energy.py --tokens 100 --ms 250 --rate 0.5
```

This outputs:

```
energy_units=12.5
```

## Code Snippet

```python
from importlib.machinery import SourceFileLoader

module = SourceFileLoader("token_energy", "code/WF-TECH-002/token_energy.py").load_module()

# 100 tokens at 250 ms each with a 0.5 EU/sec rate
print(module.energy_units(100, 250, rate=0.5))  # 12.5
```

The snippet demonstrates how client code can convert token timings into energy units for test assertions.
