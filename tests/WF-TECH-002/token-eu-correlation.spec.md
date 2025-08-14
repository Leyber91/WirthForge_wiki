# Token Timing to Energy Unit Correlation

This test validates that token timing measurements translate into energy units (EU) as defined in WF-TECH-002.

## Scenarios

- **Nominal**: 100 tokens at 250 ms each using a 0.5 EU/sec rate should yield 12.5 EU.
- **Zero Tokens**: A run with 0 tokens should return 0 EU.
- **Custom Rate**: Adjusting the rate to 1.0 should double the computed EU.

Implementations should surface these cases through the CLI helper for consistent validation across environments.
