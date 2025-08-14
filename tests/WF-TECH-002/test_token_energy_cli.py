import json
import subprocess
import sys
from pathlib import Path


def run_cli(tokens: int, ms: float, rate: float = 0.5) -> float:
    script = Path(__file__).resolve().parents[2] / 'code' / 'WF-TECH-002' / 'token_energy.py'
    result = subprocess.run(
        [sys.executable, str(script), '--tokens', str(tokens), '--ms', str(ms), '--rate', str(rate)],
        check=True, capture_output=True, text=True
    )
    # Output format: energy_units=<value>
    return float(result.stdout.strip().split('=')[1])


def test_nominal_case():
    assert run_cli(100, 250, 0.5) == 12.5


def test_zero_tokens():
    assert run_cli(0, 250, 0.5) == 0.0


def test_custom_rate():
    assert run_cli(100, 250, 1.0) == 25.0
