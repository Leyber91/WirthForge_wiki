#!/usr/bin/env python3
"""
WF-TECH-007 End-to-End User Journey Tests
========================================

Comprehensive end-to-end testing suite covering complete user workflows
from system startup through energy visualization and interaction.

Key Features:
- Complete user journey simulation
- Multi-session workflow testing
- Error recovery and resilience
- Performance validation throughout journeys
- Accessibility compliance verification
- Real-time energy visualization validation

Dependencies:
- pytest-asyncio
- playwright
- websockets
- psutil (optional)
"""

import asyncio
import json
import logging
import time
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path

import pytest
import websockets
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class JourneyStep:
    """Represents a single step in a user journey."""
    name: str
    action: str
    expected_outcome: str
    timeout_ms: int = 5000
    performance_budget_ms: Optional[int] = None
    accessibility_check: bool = False

@dataclass
class JourneyResult:
    """Results from executing a user journey."""
    journey_name: str
    steps_completed: int
    total_steps: int
    success: bool
    duration_ms: float
    performance_violations: List[str]
    accessibility_violations: List[str]
    errors: List[str]
    timestamp: str

class UserJourneyOrchestrator:
    """Orchestrates end-to-end user journey testing."""
    
    def __init__(self, base_url: str = "http://localhost:3000", ws_url: str = "ws://localhost:8080/ws"):
        self.base_url = base_url
        self.ws_url = ws_url
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.ws_connection: Optional[websockets.WebSocketServerProtocol] = None
        self.journey_results: List[JourneyResult] = []
        
    async def setup_browser(self):
        """Initialize browser and page for testing."""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=False)
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir='test_videos/',
            record_video_size={'width': 1920, 'height': 1080}
        )
        self.page = await self.context.new_page()
        
        # Enable console logging
        self.page.on("console", lambda msg: logger.info(f"Browser: {msg.text}"))
        self.page.on("pageerror", lambda error: logger.error(f"Page Error: {error}"))
        
    async def teardown_browser(self):
        """Clean up browser resources."""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
            
    async def connect_websocket(self):
        """Establish WebSocket connection for real-time validation."""
        try:
            self.ws_connection = await websockets.connect(self.ws_url)
            logger.info("WebSocket connection established")
        except Exception as e:
            logger.warning(f"WebSocket connection failed: {e}")
            
    async def disconnect_websocket(self):
        """Close WebSocket connection."""
        if self.ws_connection:
            await self.ws_connection.close()
            
    async def execute_journey(self, journey_name: str, steps: List[JourneyStep]) -> JourneyResult:
        """Execute a complete user journey."""
        start_time = time.time()
        steps_completed = 0
        performance_violations = []
        accessibility_violations = []
        errors = []
        
        logger.info(f"Starting journey: {journey_name}")
        
        try:
            for i, step in enumerate(steps):
                logger.info(f"Executing step {i+1}/{len(steps)}: {step.name}")
                
                step_start = time.time()
                success = await self._execute_step(step)
                step_duration = (time.time() - step_start) * 1000
                
                if not success:
                    errors.append(f"Step '{step.name}' failed")
                    break
                    
                # Check performance budget
                if step.performance_budget_ms and step_duration > step.performance_budget_ms:
                    performance_violations.append(
                        f"Step '{step.name}' exceeded budget: {step_duration:.1f}ms > {step.performance_budget_ms}ms"
                    )
                    
                # Check accessibility if required
                if step.accessibility_check:
                    a11y_issues = await self._check_accessibility()
                    accessibility_violations.extend(a11y_issues)
                    
                steps_completed += 1
                
        except Exception as e:
            errors.append(f"Journey execution error: {str(e)}")
            logger.error(f"Journey execution error: {e}")
            
        duration_ms = (time.time() - start_time) * 1000
        success = steps_completed == len(steps) and len(errors) == 0
        
        result = JourneyResult(
            journey_name=journey_name,
            steps_completed=steps_completed,
            total_steps=len(steps),
            success=success,
            duration_ms=duration_ms,
            performance_violations=performance_violations,
            accessibility_violations=accessibility_violations,
            errors=errors,
            timestamp=datetime.now().isoformat()
        )
        
        self.journey_results.append(result)
        logger.info(f"Journey '{journey_name}' completed: {success}")
        return result
        
    async def _execute_step(self, step: JourneyStep) -> bool:
        """Execute a single journey step."""
        try:
            if step.action == "navigate":
                await self.page.goto(self.base_url, wait_until="networkidle")
                
            elif step.action == "wait_for_energy_display":
                await self.page.wait_for_selector("[data-testid='energy-display']", timeout=step.timeout_ms)
                
            elif step.action == "verify_websocket_connection":
                # Check if WebSocket connection indicator is active
                ws_indicator = await self.page.wait_for_selector(
                    "[data-testid='websocket-status'][data-status='connected']",
                    timeout=step.timeout_ms
                )
                return ws_indicator is not None
                
            elif step.action == "interact_with_energy_controls":
                # Click on energy control elements
                await self.page.click("[data-testid='energy-control-play']")
                await self.page.wait_for_timeout(1000)
                await self.page.click("[data-testid='energy-control-pause']")
                
            elif step.action == "validate_energy_visualization":
                # Verify energy values are updating
                initial_value = await self.page.get_attribute("[data-testid='energy-value']", "data-value")
                await self.page.wait_for_timeout(2000)
                updated_value = await self.page.get_attribute("[data-testid='energy-value']", "data-value")
                return initial_value != updated_value
                
            elif step.action == "test_session_persistence":
                # Refresh page and verify session restoration
                await self.page.reload(wait_until="networkidle")
                session_restored = await self.page.wait_for_selector(
                    "[data-testid='session-restored']",
                    timeout=step.timeout_ms
                )
                return session_restored is not None
                
            elif step.action == "verify_frame_rate":
                # Monitor frame rate for smooth animation
                frame_times = await self.page.evaluate("""
                    () => {
                        return new Promise((resolve) => {
                            const times = [];
                            let lastTime = performance.now();
                            let frameCount = 0;
                            
                            function measureFrame() {
                                const currentTime = performance.now();
                                times.push(currentTime - lastTime);
                                lastTime = currentTime;
                                frameCount++;
                                
                                if (frameCount < 60) {
                                    requestAnimationFrame(measureFrame);
                                } else {
                                    resolve(times);
                                }
                            }
                            
                            requestAnimationFrame(measureFrame);
                        });
                    }
                """)
                
                avg_frame_time = statistics.mean(frame_times[1:])  # Skip first frame
                return avg_frame_time <= 16.67  # 60 FPS budget
                
            elif step.action == "test_error_recovery":
                # Simulate network disconnection and recovery
                await self.context.set_offline(True)
                await self.page.wait_for_timeout(2000)
                await self.context.set_offline(False)
                
                # Wait for reconnection indicator
                reconnected = await self.page.wait_for_selector(
                    "[data-testid='websocket-status'][data-status='connected']",
                    timeout=step.timeout_ms
                )
                return reconnected is not None
                
            elif step.action == "validate_accessibility":
                # Basic accessibility checks
                return await self._check_accessibility() == []
                
            else:
                logger.warning(f"Unknown action: {step.action}")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Step execution error: {e}")
            return False
            
    async def _check_accessibility(self) -> List[str]:
        """Perform basic accessibility checks."""
        violations = []
        
        try:
            # Check for missing alt text on images
            images_without_alt = await self.page.evaluate("""
                () => {
                    const images = Array.from(document.querySelectorAll('img'));
                    return images.filter(img => !img.alt).length;
                }
            """)
            
            if images_without_alt > 0:
                violations.append(f"{images_without_alt} images missing alt text")
                
            # Check for proper heading structure
            headings = await self.page.evaluate("""
                () => {
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                    return headings.map(h => h.tagName);
                }
            """)
            
            if headings and headings[0] != 'H1':
                violations.append("Page should start with H1 heading")
                
            # Check for keyboard navigation support
            focusable_elements = await self.page.evaluate("""
                () => {
                    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
                    return document.querySelectorAll(selector).length;
                }
            """)
            
            if focusable_elements == 0:
                violations.append("No focusable elements found")
                
        except Exception as e:
            violations.append(f"Accessibility check error: {str(e)}")
            
        return violations

# Predefined User Journeys
def get_first_time_user_journey() -> List[JourneyStep]:
    """Complete first-time user experience journey."""
    return [
        JourneyStep("Navigate to App", "navigate", "App loads successfully", 10000),
        JourneyStep("Wait for Energy Display", "wait_for_energy_display", "Energy display appears", 5000),
        JourneyStep("Verify WebSocket Connection", "verify_websocket_connection", "WebSocket connects", 3000),
        JourneyStep("Validate Initial Energy State", "validate_energy_visualization", "Energy values display", 2000),
        JourneyStep("Test Energy Controls", "interact_with_energy_controls", "Controls respond", 1000, 500),
        JourneyStep("Verify Frame Rate", "verify_frame_rate", "60 FPS maintained", 2000, 16.67),
        JourneyStep("Check Accessibility", "validate_accessibility", "No A11Y violations", 1000, accessibility_check=True)
    ]

def get_power_user_journey() -> List[JourneyStep]:
    """Advanced user workflow with complex interactions."""
    return [
        JourneyStep("Navigate to App", "navigate", "App loads successfully", 5000),
        JourneyStep("Wait for Energy Display", "wait_for_energy_display", "Energy display appears", 3000),
        JourneyStep("Verify WebSocket Connection", "verify_websocket_connection", "WebSocket connects", 2000),
        JourneyStep("Advanced Energy Interaction", "interact_with_energy_controls", "Advanced controls work", 2000),
        JourneyStep("Test Session Persistence", "test_session_persistence", "Session restores", 5000),
        JourneyStep("Validate Energy Accuracy", "validate_energy_visualization", "Energy values accurate", 3000),
        JourneyStep("Performance Under Load", "verify_frame_rate", "Performance maintained", 5000, 16.67),
        JourneyStep("Error Recovery Test", "test_error_recovery", "Recovers from errors", 10000)
    ]

def get_accessibility_focused_journey() -> List[JourneyStep]:
    """Journey focused on accessibility compliance."""
    return [
        JourneyStep("Navigate to App", "navigate", "App loads successfully", 10000),
        JourneyStep("Initial A11Y Check", "validate_accessibility", "No initial violations", 2000, accessibility_check=True),
        JourneyStep("Wait for Energy Display", "wait_for_energy_display", "Energy display appears", 5000),
        JourneyStep("Post-Load A11Y Check", "validate_accessibility", "No post-load violations", 2000, accessibility_check=True),
        JourneyStep("Interactive A11Y Check", "interact_with_energy_controls", "Controls accessible", 2000, accessibility_check=True),
        JourneyStep("Final A11Y Validation", "validate_accessibility", "Full compliance", 2000, accessibility_check=True)
    ]

# Pytest Test Cases
class TestUserJourneys:
    """Pytest test cases for user journey validation."""
    
    @pytest.fixture
    async def orchestrator(self):
        """Setup and teardown orchestrator."""
        orch = UserJourneyOrchestrator()
        await orch.setup_browser()
        await orch.connect_websocket()
        yield orch
        await orch.disconnect_websocket()
        await orch.teardown_browser()
        
    @pytest.mark.asyncio
    async def test_first_time_user_journey(self, orchestrator):
        """Test complete first-time user experience."""
        journey = get_first_time_user_journey()
        result = await orchestrator.execute_journey("First Time User", journey)
        
        assert result.success, f"Journey failed: {result.errors}"
        assert result.steps_completed == result.total_steps
        assert len(result.performance_violations) == 0, f"Performance issues: {result.performance_violations}"
        assert len(result.accessibility_violations) == 0, f"Accessibility issues: {result.accessibility_violations}"
        
    @pytest.mark.asyncio
    async def test_power_user_journey(self, orchestrator):
        """Test advanced user workflow."""
        journey = get_power_user_journey()
        result = await orchestrator.execute_journey("Power User", journey)
        
        assert result.success, f"Journey failed: {result.errors}"
        assert result.steps_completed == result.total_steps
        assert result.duration_ms < 30000, f"Journey too slow: {result.duration_ms}ms"
        
    @pytest.mark.asyncio
    async def test_accessibility_journey(self, orchestrator):
        """Test accessibility compliance throughout user journey."""
        journey = get_accessibility_focused_journey()
        result = await orchestrator.execute_journey("Accessibility Focus", journey)
        
        assert result.success, f"Journey failed: {result.errors}"
        assert len(result.accessibility_violations) == 0, f"Accessibility violations: {result.accessibility_violations}"
        
    @pytest.mark.asyncio
    async def test_concurrent_user_journeys(self, orchestrator):
        """Test multiple concurrent user sessions."""
        journeys = [
            ("User A", get_first_time_user_journey()),
            ("User B", get_power_user_journey()),
            ("User C", get_accessibility_focused_journey())
        ]
        
        # Execute journeys concurrently
        tasks = []
        for name, journey in journeys:
            task = asyncio.create_task(orchestrator.execute_journey(name, journey))
            tasks.append(task)
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Validate all journeys succeeded
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                pytest.fail(f"Journey {journeys[i][0]} raised exception: {result}")
            assert result.success, f"Journey {journeys[i][0]} failed: {result.errors}"

class JourneyReporter:
    """Generate comprehensive journey test reports."""
    
    def __init__(self, results: List[JourneyResult]):
        self.results = results
        
    def generate_summary_report(self) -> Dict[str, Any]:
        """Generate summary report of all journey results."""
        total_journeys = len(self.results)
        successful_journeys = sum(1 for r in self.results if r.success)
        
        avg_duration = statistics.mean([r.duration_ms for r in self.results]) if self.results else 0
        total_performance_violations = sum(len(r.performance_violations) for r in self.results)
        total_accessibility_violations = sum(len(r.accessibility_violations) for r in self.results)
        
        return {
            "summary": {
                "total_journeys": total_journeys,
                "successful_journeys": successful_journeys,
                "success_rate": successful_journeys / total_journeys if total_journeys > 0 else 0,
                "average_duration_ms": avg_duration,
                "total_performance_violations": total_performance_violations,
                "total_accessibility_violations": total_accessibility_violations
            },
            "journey_details": [asdict(result) for result in self.results],
            "generated_at": datetime.now().isoformat()
        }
        
    def save_report(self, filepath: str):
        """Save journey report to file."""
        report = self.generate_summary_report()
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
            
        logger.info(f"Journey report saved to {filepath}")

# Main execution
if __name__ == "__main__":
    async def run_all_journeys():
        """Run all predefined user journeys."""
        orchestrator = UserJourneyOrchestrator()
        
        try:
            await orchestrator.setup_browser()
            await orchestrator.connect_websocket()
            
            # Execute all journey types
            journeys = [
                ("First Time User", get_first_time_user_journey()),
                ("Power User", get_power_user_journey()),
                ("Accessibility Focus", get_accessibility_focused_journey())
            ]
            
            for name, journey in journeys:
                await orchestrator.execute_journey(name, journey)
                
            # Generate and save report
            reporter = JourneyReporter(orchestrator.journey_results)
            reporter.save_report("reports/e2e_journey_report.json")
            
            print(f"\nCompleted {len(orchestrator.journey_results)} user journeys")
            successful = sum(1 for r in orchestrator.journey_results if r.success)
            print(f"Success rate: {successful}/{len(orchestrator.journey_results)}")
            
        finally:
            await orchestrator.disconnect_websocket()
            await orchestrator.teardown_browser()
            
    # Run the journeys
    asyncio.run(run_all_journeys())
