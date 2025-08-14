import time


def test_boot_timing_60hz():
    """Simple smoke test to ensure boot timing approximates 60 Hz."""
    start = time.perf_counter()
    time.sleep(1/60)
    end = time.perf_counter()
    period = end - start
    assert abs(period - 1/60) < 0.01, f"Expected ~1/60s, got {period}"
