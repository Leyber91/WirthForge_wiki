# health_monitor.py
import asyncio
import aiohttp
import logging
from typing import Dict, List

class HealthMonitor:
    def __init__(self):
        self.checks = {
            "orchestrator": "http://127.0.0.1:8145/health",
            "model_engine": "http://127.0.0.1:11434/api/tags",
            "decipher": "http://127.0.0.1:8145/decipher/status"
        }
        self.status = {}
    
    async def check_health(self, service: str, endpoint: str) -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(endpoint, timeout=5) as response:
                    return response.status == 200
        except Exception as e:
            logging.warning(f"Health check failed for {service}: {e}")
            return False
    
    async def monitor_loop(self):
        while True:
            for service, endpoint in self.checks.items():
                healthy = await self.check_health(service, endpoint)
                self.status[service] = {
                    "healthy": healthy,
                    "last_check": asyncio.get_event_loop().time()
                }
            await asyncio.sleep(10)  # Check every 10 seconds
