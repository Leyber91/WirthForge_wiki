import argparse


def energy_units(tokens: int, token_ms: float, rate: float = 0.5) -> float:
    """Convert token timing to energy units.

    Args:
        tokens: Number of tokens processed.
        token_ms: Time per token in milliseconds.
        rate: Energy units produced per second.

    Returns:
        Calculated energy units.
    """
    seconds = (tokens * token_ms) / 1000.0
    return seconds * rate


def main() -> None:
    parser = argparse.ArgumentParser(description="Calculate energy units from token timing")
    parser.add_argument("--tokens", type=int, required=True, help="Token count")
    parser.add_argument("--ms", type=float, required=True, help="Time per token in milliseconds")
    parser.add_argument("--rate", type=float, default=0.5, help="Energy units per second")
    args = parser.parse_args()
    eu = energy_units(args.tokens, args.ms, args.rate)
    print(f"energy_units={eu}")


if __name__ == "__main__":
    main()
