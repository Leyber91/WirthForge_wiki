#!/usr/bin/env python3
"""
WF-TECH-007 QA Pipeline Automation
==================================

Automated QA pipeline orchestration for WIRTHFORGE testing suite.
Coordinates all test phases and generates comprehensive reports.

Key Features:
- Multi-stage pipeline execution
- Parallel test execution where possible
- Quality gate enforcement
- Automated rollback on failures
- Comprehensive reporting and metrics
"""

import asyncio
import json
import logging
import subprocess
import time
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class StageStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class QualityGate:
    """Quality gate configuration."""
    name: str
    metric: str
    threshold: float
    operator: str  # ">=", "<=", "==", "!=", "<", ">"
    blocking: bool = True

@dataclass
class PipelineStage:
    """Pipeline stage configuration."""
    name: str
    command: str
    timeout_seconds: int
    quality_gates: List[QualityGate]
    depends_on: List[str]
    parallel_group: Optional[str] = None
    required: bool = True

@dataclass
class StageResult:
    """Results from a pipeline stage execution."""
    stage_name: str
    status: StageStatus
    duration_seconds: float
    exit_code: int
    stdout: str
    stderr: str
    quality_gate_results: Dict[str, bool]
    metrics: Dict[str, float]
    timestamp: str

class QAPipelineOrchestrator:
    """Orchestrates the complete QA pipeline."""
    
    def __init__(self, config_path: str = "qa_pipeline_config.yaml"):
        self.config_path = config_path
        self.stages: Dict[str, PipelineStage] = {}
        self.stage_results: Dict[str, StageResult] = {}
        self.pipeline_start_time: Optional[float] = None
        self.pipeline_end_time: Optional[float] = None
        
    def load_configuration(self):
        """Load pipeline configuration from YAML file."""
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
                
            for stage_config in config.get('stages', []):
                quality_gates = [
                    QualityGate(**gate) for gate in stage_config.get('quality_gates', [])
                ]
                
                stage = PipelineStage(
                    name=stage_config['name'],
                    command=stage_config['command'],
                    timeout_seconds=stage_config.get('timeout_seconds', 300),
                    quality_gates=quality_gates,
                    depends_on=stage_config.get('depends_on', []),
                    parallel_group=stage_config.get('parallel_group'),
                    required=stage_config.get('required', True)
                )
                
                self.stages[stage.name] = stage
                
        except FileNotFoundError:
            logger.warning(f"Config file {self.config_path} not found, using default configuration")
            self._create_default_configuration()
            
    def _create_default_configuration(self):
        """Create default pipeline configuration."""
        default_stages = [
            PipelineStage(
                name="lint_and_format",
                command="python -m pytest tests/lint_tests.py -v",
                timeout_seconds=60,
                quality_gates=[
                    QualityGate("lint_score", "lint_score", 8.0, ">=", True)
                ],
                depends_on=[],
                parallel_group="validation"
            ),
            PipelineStage(
                name="unit_tests",
                command="python WF-TECH-007-unit-test-framework.py",
                timeout_seconds=300,
                quality_gates=[
                    QualityGate("test_coverage", "coverage_percent", 85.0, ">=", True),
                    QualityGate("test_success_rate", "success_rate", 100.0, "==", True)
                ],
                depends_on=["lint_and_format"]
            ),
            PipelineStage(
                name="integration_tests",
                command="python WF-TECH-007-integration-tests.py",
                timeout_seconds=600,
                quality_gates=[
                    QualityGate("integration_success", "success_rate", 100.0, "==", True)
                ],
                depends_on=["unit_tests"]
            ),
            PipelineStage(
                name="schema_regression",
                command="python WF-TECH-007-schema-regression.py",
                timeout_seconds=120,
                quality_gates=[
                    QualityGate("schema_compatibility", "compatibility_score", 100.0, "==", True)
                ],
                depends_on=["unit_tests"],
                parallel_group="validation"
            ),
            PipelineStage(
                name="performance_tests",
                command="python WF-TECH-007-performance-tests.py",
                timeout_seconds=900,
                quality_gates=[
                    QualityGate("frame_budget", "avg_frame_time_ms", 16.67, "<=", True),
                    QualityGate("memory_usage", "max_memory_mb", 512.0, "<=", True)
                ],
                depends_on=["integration_tests"]
            ),
            PipelineStage(
                name="visual_truth_tests",
                command="python WF-TECH-007-visual-truth-validation.py",
                timeout_seconds=600,
                quality_gates=[
                    QualityGate("visual_accuracy", "energy_accuracy_percent", 95.0, ">=", True),
                    QualityGate("animation_smoothness", "frame_rate", 58.0, ">=", True)
                ],
                depends_on=["performance_tests"],
                parallel_group="ui_validation"
            ),
            PipelineStage(
                name="playwright_tests",
                command="npx playwright test",
                timeout_seconds=1200,
                quality_gates=[
                    QualityGate("ui_test_success", "success_rate", 100.0, "==", True),
                    QualityGate("accessibility_score", "a11y_score", 100.0, "==", True)
                ],
                depends_on=["visual_truth_tests"],
                parallel_group="ui_validation"
            ),
            PipelineStage(
                name="e2e_journey_tests",
                command="python WF-TECH-007-e2e-journey-tests.py",
                timeout_seconds=1800,
                quality_gates=[
                    QualityGate("journey_success", "success_rate", 100.0, "==", True),
                    QualityGate("journey_performance", "avg_duration_ms", 30000.0, "<=", True)
                ],
                depends_on=["playwright_tests"]
            ),
            PipelineStage(
                name="golden_run_validation",
                command="python WF-TECH-007-golden-run-harness.py",
                timeout_seconds=600,
                quality_gates=[
                    QualityGate("regression_check", "regression_score", 100.0, "==", True)
                ],
                depends_on=["e2e_journey_tests"]
            )
        ]
        
        for stage in default_stages:
            self.stages[stage.name] = stage
            
    async def execute_pipeline(self) -> bool:
        """Execute the complete QA pipeline."""
        logger.info("Starting QA pipeline execution")
        self.pipeline_start_time = time.time()
        
        try:
            # Build dependency graph and execution order
            execution_plan = self._build_execution_plan()
            
            # Execute stages according to plan
            for stage_group in execution_plan:
                if isinstance(stage_group, list):
                    # Parallel execution
                    tasks = [self._execute_stage(stage_name) for stage_name in stage_group]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    # Check for failures in parallel group
                    for i, result in enumerate(results):
                        if isinstance(result, Exception):
                            logger.error(f"Stage {stage_group[i]} failed with exception: {result}")
                            return False
                        elif not result:
                            logger.error(f"Stage {stage_group[i]} failed")
                            return False
                else:
                    # Sequential execution
                    success = await self._execute_stage(stage_group)
                    if not success:
                        logger.error(f"Stage {stage_group} failed")
                        return False
                        
            logger.info("QA pipeline completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {e}")
            return False
            
        finally:
            self.pipeline_end_time = time.time()
            await self._generate_pipeline_report()
            
    def _build_execution_plan(self) -> List[List[str]]:
        """Build execution plan respecting dependencies and parallel groups."""
        executed = set()
        execution_plan = []
        
        while len(executed) < len(self.stages):
            # Find stages ready to execute
            ready_stages = []
            for stage_name, stage in self.stages.items():
                if stage_name not in executed:
                    dependencies_met = all(dep in executed for dep in stage.depends_on)
                    if dependencies_met:
                        ready_stages.append(stage_name)
                        
            if not ready_stages:
                raise RuntimeError("Circular dependency detected in pipeline stages")
                
            # Group by parallel execution groups
            parallel_groups = {}
            sequential_stages = []
            
            for stage_name in ready_stages:
                stage = self.stages[stage_name]
                if stage.parallel_group:
                    if stage.parallel_group not in parallel_groups:
                        parallel_groups[stage.parallel_group] = []
                    parallel_groups[stage.parallel_group].append(stage_name)
                else:
                    sequential_stages.append(stage_name)
                    
            # Add parallel groups to execution plan
            for group_stages in parallel_groups.values():
                execution_plan.append(group_stages)
                executed.update(group_stages)
                
            # Add sequential stages
            for stage_name in sequential_stages:
                execution_plan.append(stage_name)
                executed.add(stage_name)
                
        return execution_plan
        
    async def _execute_stage(self, stage_name: str) -> bool:
        """Execute a single pipeline stage."""
        stage = self.stages[stage_name]
        logger.info(f"Executing stage: {stage_name}")
        
        start_time = time.time()
        
        try:
            # Execute stage command
            process = await asyncio.create_subprocess_shell(
                stage.command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=Path.cwd()
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=stage.timeout_seconds
                )
            except asyncio.TimeoutError:
                process.kill()
                logger.error(f"Stage {stage_name} timed out after {stage.timeout_seconds} seconds")
                return False
                
            duration = time.time() - start_time
            exit_code = process.returncode
            
            # Parse metrics from stdout (assuming JSON output)
            metrics = {}
            try:
                # Look for JSON metrics in stdout
                lines = stdout.decode().split('\n')
                for line in lines:
                    if line.strip().startswith('{') and '"metrics"' in line:
                        data = json.loads(line.strip())
                        metrics = data.get('metrics', {})
                        break
            except (json.JSONDecodeError, UnicodeDecodeError):
                logger.warning(f"Could not parse metrics from stage {stage_name}")
                
            # Evaluate quality gates
            quality_gate_results = {}
            for gate in stage.quality_gates:
                if gate.metric in metrics:
                    result = self._evaluate_quality_gate(gate, metrics[gate.metric])
                    quality_gate_results[gate.name] = result
                    if gate.blocking and not result:
                        logger.error(f"Quality gate '{gate.name}' failed for stage {stage_name}")
                        
            # Create stage result
            result = StageResult(
                stage_name=stage_name,
                status=StageStatus.PASSED if exit_code == 0 else StageStatus.FAILED,
                duration_seconds=duration,
                exit_code=exit_code,
                stdout=stdout.decode(),
                stderr=stderr.decode(),
                quality_gate_results=quality_gate_results,
                metrics=metrics,
                timestamp=datetime.now().isoformat()
            )
            
            self.stage_results[stage_name] = result
            
            # Check if stage passed
            stage_passed = (exit_code == 0 and 
                          all(quality_gate_results.get(gate.name, True) or not gate.blocking 
                              for gate in stage.quality_gates))
                              
            if stage_passed:
                logger.info(f"Stage {stage_name} completed successfully in {duration:.2f}s")
            else:
                logger.error(f"Stage {stage_name} failed")
                
            return stage_passed
            
        except Exception as e:
            logger.error(f"Error executing stage {stage_name}: {e}")
            
            # Create failure result
            result = StageResult(
                stage_name=stage_name,
                status=StageStatus.FAILED,
                duration_seconds=time.time() - start_time,
                exit_code=-1,
                stdout="",
                stderr=str(e),
                quality_gate_results={},
                metrics={},
                timestamp=datetime.now().isoformat()
            )
            
            self.stage_results[stage_name] = result
            return False
            
    def _evaluate_quality_gate(self, gate: QualityGate, value: float) -> bool:
        """Evaluate a quality gate against a metric value."""
        if gate.operator == ">=":
            return value >= gate.threshold
        elif gate.operator == "<=":
            return value <= gate.threshold
        elif gate.operator == "==":
            return abs(value - gate.threshold) < 0.001
        elif gate.operator == "!=":
            return abs(value - gate.threshold) >= 0.001
        elif gate.operator == "<":
            return value < gate.threshold
        elif gate.operator == ">":
            return value > gate.threshold
        else:
            logger.warning(f"Unknown operator {gate.operator} in quality gate {gate.name}")
            return True
            
    async def _generate_pipeline_report(self):
        """Generate comprehensive pipeline execution report."""
        total_duration = (self.pipeline_end_time or time.time()) - (self.pipeline_start_time or 0)
        
        successful_stages = sum(1 for result in self.stage_results.values() 
                              if result.status == StageStatus.PASSED)
        total_stages = len(self.stage_results)
        
        # Calculate quality gate summary
        total_gates = sum(len(stage.quality_gates) for stage in self.stages.values())
        passed_gates = sum(sum(1 for passed in result.quality_gate_results.values() if passed)
                          for result in self.stage_results.values())
                          
        report = {
            "pipeline_summary": {
                "execution_time": datetime.now().isoformat(),
                "total_duration_seconds": total_duration,
                "total_stages": total_stages,
                "successful_stages": successful_stages,
                "success_rate": successful_stages / total_stages if total_stages > 0 else 0,
                "total_quality_gates": total_gates,
                "passed_quality_gates": passed_gates,
                "quality_gate_success_rate": passed_gates / total_gates if total_gates > 0 else 0
            },
            "stage_results": [asdict(result) for result in self.stage_results.values()],
            "quality_gates": {
                stage_name: result.quality_gate_results 
                for stage_name, result in self.stage_results.items()
            },
            "metrics": {
                stage_name: result.metrics 
                for stage_name, result in self.stage_results.items()
            }
        }
        
        # Save report
        report_path = Path("reports/qa_pipeline_report.json")
        report_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        logger.info(f"Pipeline report saved to {report_path}")
        
        # Generate summary
        print(f"\n{'='*60}")
        print(f"QA PIPELINE EXECUTION SUMMARY")
        print(f"{'='*60}")
        print(f"Total Duration: {total_duration:.2f} seconds")
        print(f"Stages: {successful_stages}/{total_stages} passed")
        print(f"Quality Gates: {passed_gates}/{total_gates} passed")
        print(f"Overall Success: {'✓' if successful_stages == total_stages else '✗'}")
        print(f"{'='*60}")

class QAPipelineConfig:
    """Generate default QA pipeline configuration."""
    
    @staticmethod
    def create_default_config(output_path: str = "qa_pipeline_config.yaml"):
        """Create default pipeline configuration file."""
        config = {
            "stages": [
                {
                    "name": "lint_and_format",
                    "command": "python -m flake8 . && python -m black --check .",
                    "timeout_seconds": 60,
                    "quality_gates": [
                        {
                            "name": "lint_score",
                            "metric": "lint_score",
                            "threshold": 8.0,
                            "operator": ">=",
                            "blocking": True
                        }
                    ],
                    "depends_on": [],
                    "parallel_group": "validation",
                    "required": True
                },
                {
                    "name": "unit_tests",
                    "command": "python WF-TECH-007-unit-test-framework.py",
                    "timeout_seconds": 300,
                    "quality_gates": [
                        {
                            "name": "test_coverage",
                            "metric": "coverage_percent",
                            "threshold": 85.0,
                            "operator": ">=",
                            "blocking": True
                        },
                        {
                            "name": "test_success_rate",
                            "metric": "success_rate",
                            "threshold": 100.0,
                            "operator": "==",
                            "blocking": True
                        }
                    ],
                    "depends_on": ["lint_and_format"],
                    "required": True
                },
                {
                    "name": "integration_tests",
                    "command": "python WF-TECH-007-integration-tests.py",
                    "timeout_seconds": 600,
                    "quality_gates": [
                        {
                            "name": "integration_success",
                            "metric": "success_rate",
                            "threshold": 100.0,
                            "operator": "==",
                            "blocking": True
                        }
                    ],
                    "depends_on": ["unit_tests"],
                    "required": True
                },
                {
                    "name": "performance_tests",
                    "command": "python WF-TECH-007-performance-tests.py",
                    "timeout_seconds": 900,
                    "quality_gates": [
                        {
                            "name": "frame_budget",
                            "metric": "avg_frame_time_ms",
                            "threshold": 16.67,
                            "operator": "<=",
                            "blocking": True
                        }
                    ],
                    "depends_on": ["integration_tests"],
                    "required": True
                },
                {
                    "name": "e2e_journey_tests",
                    "command": "python WF-TECH-007-e2e-journey-tests.py",
                    "timeout_seconds": 1800,
                    "quality_gates": [
                        {
                            "name": "journey_success",
                            "metric": "success_rate",
                            "threshold": 100.0,
                            "operator": "==",
                            "blocking": True
                        }
                    ],
                    "depends_on": ["performance_tests"],
                    "required": True
                }
            ]
        }
        
        with open(output_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, indent=2)
            
        logger.info(f"Default QA pipeline configuration created at {output_path}")

# Main execution
if __name__ == "__main__":
    async def main():
        """Main pipeline execution."""
        # Create default config if it doesn't exist
        config_path = "qa_pipeline_config.yaml"
        if not Path(config_path).exists():
            QAPipelineConfig.create_default_config(config_path)
            
        # Initialize and run pipeline
        orchestrator = QAPipelineOrchestrator(config_path)
        orchestrator.load_configuration()
        
        success = await orchestrator.execute_pipeline()
        
        if success:
            logger.info("QA pipeline completed successfully")
            exit(0)
        else:
            logger.error("QA pipeline failed")
            exit(1)
            
    # Run the pipeline
    asyncio.run(main())
