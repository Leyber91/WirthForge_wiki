import math

# weights must sum to 1.0
W1, W2, W3 = 0.4, 0.4, 0.2


def energy(cadence, certainty, stall):
    """Compute normalized energy value."""
    e = W1*cadence + W2*certainty + W3*(1-stall)
    return max(0.0, min(1.0, e))


def level(e):
    if e < 0.2:
        return 1
    if e < 0.4:
        return 2
    if e < 0.6:
        return 3
    if e < 0.8:
        return 4
    return 5


def test_energy_bounds():
    samples = [
        (0.0, 0.0, 1.0),
        (1.0, 1.0, 0.0),
        (0.5, 0.5, 0.5),
    ]
    for c, p, s in samples:
        e = energy(c, p, s)
        assert 0.0 <= e <= 1.0, e


def test_level_progression():
    assert level(0.05) == 1
    assert level(0.3) == 2
    assert level(0.5) == 3
    assert level(0.7) == 4
    assert level(0.95) == 5

if __name__ == "__main__":
    test_energy_bounds()
    test_level_progression()
    print("tests passed")
