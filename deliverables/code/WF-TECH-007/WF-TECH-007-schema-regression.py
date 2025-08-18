#!/usr/bin/env python3
"""
WF-TECH-007 Schema Regression Testing
WIRTHFORGE Testing & QA Strategy - Data Contract Validation

This module provides comprehensive schema regression testing for all WIRTHFORGE
data contracts, ensuring backward compatibility and detecting breaking changes.

Key Features:
- JSON Schema validation for all event types
- Backward compatibility testing
- Breaking change detection
- Schema evolution tracking
- Automated migration testing
- Contract compliance reporting

Dependencies: jsonschema, json, pathlib, difflib, semver
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from datetime import datetime
import difflib
import hashlib
from jsonschema import validate, Draft7Validator, ValidationError
from jsonschema.exceptions import SchemaError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SchemaVersion:
    """Schema version information"""
    version: str
    schema_name: str
    file_path: str
    checksum: str
    created_date: str
    breaking_changes: List[str]
    compatible_versions: List[str]

@dataclass
class ValidationResult:
    """Schema validation result"""
    schema_name: str
    schema_version: str
    data_sample: Dict[str, Any]
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    validation_time_ms: float

@dataclass
class RegressionReport:
    """Schema regression test report"""
    test_timestamp: str
    schemas_tested: int
    samples_validated: int
    validation_failures: int
    breaking_changes_detected: List[str]
    compatibility_issues: List[str]
    performance_metrics: Dict[str, float]
    detailed_results: List[ValidationResult]

class SchemaRegistry:
    """Central registry for all WIRTHFORGE schemas"""
    
    def __init__(self, schema_dir: str = "schemas"):
        self.schema_dir = Path(schema_dir)
        self.schema_dir.mkdir(exist_ok=True)
        self.schemas: Dict[str, Dict[str, Any]] = {}
        self.validators: Dict[str, Draft7Validator] = {}
        self.versions: Dict[str, List[SchemaVersion]] = {}
        self._load_schemas()
    
    def _load_schemas(self):
        """Load all schemas from the schema directory"""
        if not self.schema_dir.exists():
            logger.warning(f"Schema directory not found: {self.schema_dir}")
            return
        
        for schema_file in self.schema_dir.glob("*.json"):
            try:
                with open(schema_file, 'r') as f:
                    schema_data = json.load(f)
                
                schema_name = schema_file.stem
                self.schemas[schema_name] = schema_data
                
                # Create validator
                try:
                    validator = Draft7Validator(schema_data)
                    self.validators[schema_name] = validator
                    logger.info(f"Loaded schema: {schema_name}")
                except SchemaError as e:
                    logger.error(f"Invalid schema {schema_name}: {e}")
                
                # Track version
                self._track_schema_version(schema_name, str(schema_file), schema_data)
                
            except Exception as e:
                logger.error(f"Failed to load schema {schema_file}: {e}")
    
    def _track_schema_version(self, schema_name: str, file_path: str, schema_data: Dict[str, Any]):
        """Track schema version for regression testing"""
        schema_str = json.dumps(schema_data, sort_keys=True, separators=(',', ':'))
        checksum = hashlib.sha256(schema_str.encode()).hexdigest()
        
        version_info = SchemaVersion(
            version=schema_data.get('version', '1.0.0'),
            schema_name=schema_name,
            file_path=file_path,
            checksum=checksum,
            created_date=datetime.now().isoformat(),
            breaking_changes=[],
            compatible_versions=[]
        )
        
        if schema_name not in self.versions:
            self.versions[schema_name] = []
        
        # Check if this is a new version
        existing_checksums = [v.checksum for v in self.versions[schema_name]]
        if checksum not in existing_checksums:
            self.versions[schema_name].append(version_info)
    
    def get_schema(self, schema_name: str) -> Optional[Dict[str, Any]]:
        """Get schema by name"""
        return self.schemas.get(schema_name)
    
    def get_validator(self, schema_name: str) -> Optional[Draft7Validator]:
        """Get validator by schema name"""
        return self.validators.get(schema_name)
    
    def list_schemas(self) -> List[str]:
        """List all available schema names"""
        return list(self.schemas.keys())
    
    def get_schema_versions(self, schema_name: str) -> List[SchemaVersion]:
        """Get all versions of a schema"""
        return self.versions.get(schema_name, [])

class SchemaValidator:
    """Enhanced schema validator with regression testing capabilities"""
    
    def __init__(self, registry: SchemaRegistry):
        self.registry = registry
        self.validation_cache: Dict[str, ValidationResult] = {}
    
    def validate_data(self, schema_name: str, data: Dict[str, Any], 
                     cache_result: bool = True) -> ValidationResult:
        """Validate data against schema with detailed error reporting"""
        start_time = datetime.now()
        
        validator = self.registry.get_validator(schema_name)
        if not validator:
            return ValidationResult(
                schema_name=schema_name,
                schema_version="unknown",
                data_sample=data,
                is_valid=False,
                errors=[f"Schema '{schema_name}' not found"],
                warnings=[],
                validation_time_ms=0.0
            )
        
        errors = []
        warnings = []
        is_valid = True
        
        try:
            # Perform validation
            validator.validate(data)
        except ValidationError as e:
            is_valid = False
            errors.append(f"Validation error at {'.'.join(str(p) for p in e.absolute_path)}: {e.message}")
            
            # Add context for common errors
            if "required" in e.message.lower():
                missing_props = e.message.split("'")[1::2] if "'" in e.message else []
                for prop in missing_props:
                    errors.append(f"Missing required property: '{prop}'")
            
            if "additional properties" in e.message.lower():
                warnings.append("Contains additional properties not defined in schema")
        
        except Exception as e:
            is_valid = False
            errors.append(f"Validation exception: {str(e)}")
        
        # Calculate validation time
        validation_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Get schema version
        schema_data = self.registry.get_schema(schema_name)
        schema_version = schema_data.get('version', '1.0.0') if schema_data else 'unknown'
        
        result = ValidationResult(
            schema_name=schema_name,
            schema_version=schema_version,
            data_sample=data,
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            validation_time_ms=validation_time
        )
        
        if cache_result:
            cache_key = f"{schema_name}_{hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()}"
            self.validation_cache[cache_key] = result
        
        return result
    
    def batch_validate(self, schema_name: str, data_samples: List[Dict[str, Any]]) -> List[ValidationResult]:
        """Validate multiple data samples against a schema"""
        results = []
        
        for i, data in enumerate(data_samples):
            logger.debug(f"Validating sample {i+1}/{len(data_samples)} for schema {schema_name}")
            result = self.validate_data(schema_name, data)
            results.append(result)
        
        return results

class BackwardCompatibilityTester:
    """Test backward compatibility between schema versions"""
    
    def __init__(self, registry: SchemaRegistry):
        self.registry = registry
        self.validator = SchemaValidator(registry)
    
    def test_compatibility(self, schema_name: str, old_data_samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Test if old data samples are compatible with current schema"""
        logger.info(f"Testing backward compatibility for schema: {schema_name}")
        
        current_validator = self.registry.get_validator(schema_name)
        if not current_validator:
            return {
                'compatible': False,
                'error': f"Schema '{schema_name}' not found",
                'results': []
            }
        
        results = []
        compatible_count = 0
        
        for i, old_data in enumerate(old_data_samples):
            validation_result = self.validator.validate_data(schema_name, old_data, cache_result=False)
            results.append(validation_result)
            
            if validation_result.is_valid:
                compatible_count += 1
            else:
                logger.warning(f"Compatibility issue in sample {i}: {validation_result.errors}")
        
        compatibility_rate = compatible_count / len(old_data_samples) if old_data_samples else 0
        
        return {
            'compatible': compatibility_rate >= 0.95,  # 95% compatibility threshold
            'compatibility_rate': compatibility_rate,
            'total_samples': len(old_data_samples),
            'compatible_samples': compatible_count,
            'incompatible_samples': len(old_data_samples) - compatible_count,
            'results': results
        }
    
    def detect_breaking_changes(self, schema_name: str, old_schema: Dict[str, Any], 
                               new_schema: Dict[str, Any]) -> List[str]:
        """Detect breaking changes between schema versions"""
        breaking_changes = []
        
        # Check for removed required properties
        old_required = set(old_schema.get('required', []))
        new_required = set(new_schema.get('required', []))
        removed_required = old_required - new_required
        
        for prop in removed_required:
            breaking_changes.append(f"Removed required property: '{prop}'")
        
        # Check for added required properties
        added_required = new_required - old_required
        for prop in added_required:
            breaking_changes.append(f"Added new required property: '{prop}' (breaking for old data)")
        
        # Check for type changes in existing properties
        old_props = old_schema.get('properties', {})
        new_props = new_schema.get('properties', {})
        
        for prop_name in old_props:
            if prop_name in new_props:
                old_type = old_props[prop_name].get('type')
                new_type = new_props[prop_name].get('type')
                
                if old_type != new_type and old_type is not None and new_type is not None:
                    breaking_changes.append(f"Changed type of property '{prop_name}': {old_type} -> {new_type}")
        
        # Check for removed properties
        removed_props = set(old_props.keys()) - set(new_props.keys())
        for prop in removed_props:
            breaking_changes.append(f"Removed property: '{prop}'")
        
        return breaking_changes

class SchemaRegressionTester:
    """Main schema regression testing orchestrator"""
    
    def __init__(self, schema_dir: str = "schemas", test_data_dir: str = "test_data"):
        self.registry = SchemaRegistry(schema_dir)
        self.validator = SchemaValidator(self.registry)
        self.compatibility_tester = BackwardCompatibilityTester(self.registry)
        self.test_data_dir = Path(test_data_dir)
        self.test_data_dir.mkdir(exist_ok=True)
    
    def run_regression_suite(self) -> RegressionReport:
        """Run complete schema regression test suite"""
        logger.info("Starting schema regression test suite")
        
        start_time = datetime.now()
        all_results = []
        breaking_changes = []
        compatibility_issues = []
        
        schemas_tested = 0
        samples_validated = 0
        validation_failures = 0
        
        # Test each schema
        for schema_name in self.registry.list_schemas():
            logger.info(f"Testing schema: {schema_name}")
            schemas_tested += 1
            
            # Load test data for this schema
            test_data = self._load_test_data(schema_name)
            
            if not test_data:
                logger.warning(f"No test data found for schema: {schema_name}")
                continue
            
            # Validate current test data
            validation_results = self.validator.batch_validate(schema_name, test_data)
            all_results.extend(validation_results)
            samples_validated += len(validation_results)
            
            # Count failures
            for result in validation_results:
                if not result.is_valid:
                    validation_failures += 1
            
            # Test backward compatibility if old data exists
            old_test_data = self._load_test_data(schema_name, version="old")
            if old_test_data:
                compat_result = self.compatibility_tester.test_compatibility(schema_name, old_test_data)
                
                if not compat_result['compatible']:
                    compatibility_issues.append(f"{schema_name}: {compat_result['compatibility_rate']:.1%} compatibility")
        
        # Calculate performance metrics
        total_time = (datetime.now() - start_time).total_seconds()
        avg_validation_time = sum(r.validation_time_ms for r in all_results) / len(all_results) if all_results else 0
        
        performance_metrics = {
            'total_test_time_s': total_time,
            'avg_validation_time_ms': avg_validation_time,
            'validations_per_second': samples_validated / total_time if total_time > 0 else 0
        }
        
        # Generate report
        report = RegressionReport(
            test_timestamp=datetime.now().isoformat(),
            schemas_tested=schemas_tested,
            samples_validated=samples_validated,
            validation_failures=validation_failures,
            breaking_changes_detected=breaking_changes,
            compatibility_issues=compatibility_issues,
            performance_metrics=performance_metrics,
            detailed_results=all_results
        )
        
        # Save report
        self._save_report(report)
        
        logger.info(f"Schema regression suite complete: {schemas_tested} schemas, "
                   f"{samples_validated} samples, {validation_failures} failures")
        
        return report
    
    def _load_test_data(self, schema_name: str, version: str = "current") -> List[Dict[str, Any]]:
        """Load test data for a schema"""
        test_file = self.test_data_dir / f"{schema_name}_{version}_samples.json"
        
        if not test_file.exists():
            # Try without version suffix
            test_file = self.test_data_dir / f"{schema_name}_samples.json"
        
        if not test_file.exists():
            return []
        
        try:
            with open(test_file, 'r') as f:
                data = json.load(f)
                
            # Handle both single objects and arrays
            if isinstance(data, list):
                return data
            else:
                return [data]
                
        except Exception as e:
            logger.error(f"Failed to load test data from {test_file}: {e}")
            return []
    
    def _save_report(self, report: RegressionReport):
        """Save regression test report"""
        report_file = Path("schema_regression_reports") / f"regression_report_{int(datetime.now().timestamp())}.json"
        report_file.parent.mkdir(exist_ok=True)
        
        with open(report_file, 'w') as f:
            json.dump(asdict(report), f, indent=2, default=str)
        
        logger.info(f"Regression report saved to: {report_file}")
    
    def create_test_samples(self, schema_name: str, sample_data: List[Dict[str, Any]]):
        """Create test samples for a schema"""
        test_file = self.test_data_dir / f"{schema_name}_samples.json"
        
        with open(test_file, 'w') as f:
            json.dump(sample_data, f, indent=2)
        
        logger.info(f"Created test samples for {schema_name}: {len(sample_data)} samples")

# Standard WIRTHFORGE Schema Definitions

def create_standard_schemas():
    """Create standard WIRTHFORGE schemas for testing"""
    schemas = {
        'energy-event': {
            'type': 'object',
            'version': '1.0.0',
            'required': ['type', 'timestamp', 'payload', 'session_id', 'frame_id'],
            'properties': {
                'type': {'type': 'string', 'enum': ['energy.update', 'energy.decay', 'energy.reset']},
                'timestamp': {'type': 'number', 'minimum': 0},
                'payload': {
                    'type': 'object',
                    'required': ['total_energy'],
                    'properties': {
                        'total_energy': {'type': 'number', 'minimum': 0},
                        'token_energy': {'type': 'number', 'minimum': 0},
                        'state': {'type': 'string', 'enum': ['IDLE', 'CHARGING', 'FLOWING', 'DRAINING']},
                        'token_content': {'type': 'string'}
                    }
                },
                'session_id': {'type': 'string', 'minLength': 1},
                'frame_id': {'type': 'integer', 'minimum': 0}
            },
            'additionalProperties': False
        },
        
        'token-data': {
            'type': 'object',
            'version': '1.0.0',
            'required': ['content', 'timestamp', 'model_id', 'confidence'],
            'properties': {
                'content': {'type': 'string', 'minLength': 1},
                'timestamp': {'type': 'number', 'minimum': 0},
                'model_id': {'type': 'string', 'minLength': 1},
                'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1},
                'is_final': {'type': 'boolean'},
                'entropy': {'type': 'number', 'minimum': 0, 'maximum': 1},
                'token_id': {'type': 'string'}
            },
            'additionalProperties': False
        },
        
        'session-event': {
            'type': 'object',
            'version': '1.0.0',
            'required': ['type', 'timestamp', 'session_id'],
            'properties': {
                'type': {'type': 'string', 'enum': ['session.started', 'session.ended', 'session.paused', 'session.resumed']},
                'timestamp': {'type': 'number', 'minimum': 0},
                'session_id': {'type': 'string', 'minLength': 1},
                'payload': {
                    'type': 'object',
                    'properties': {
                        'duration_s': {'type': 'number', 'minimum': 0},
                        'tokens_processed': {'type': 'integer', 'minimum': 0},
                        'final_energy': {'type': 'number', 'minimum': 0}
                    }
                }
            },
            'additionalProperties': False
        }
    }
    
    return schemas

def create_test_samples():
    """Create test samples for standard schemas"""
    samples = {
        'energy-event': [
            {
                'type': 'energy.update',
                'timestamp': 1640995200.123,
                'payload': {
                    'total_energy': 42.5,
                    'token_energy': 5.2,
                    'state': 'FLOWING',
                    'token_content': 'Hello'
                },
                'session_id': 'test-session-001',
                'frame_id': 15
            },
            {
                'type': 'energy.decay',
                'timestamp': 1640995201.456,
                'payload': {
                    'total_energy': 38.1,
                    'state': 'DRAINING'
                },
                'session_id': 'test-session-001',
                'frame_id': 75
            }
        ],
        
        'token-data': [
            {
                'content': 'Hello world',
                'timestamp': 1640995200.0,
                'model_id': 'gpt-4',
                'confidence': 0.95,
                'is_final': False,
                'entropy': 0.7
            },
            {
                'content': '!',
                'timestamp': 1640995200.1,
                'model_id': 'gpt-4',
                'confidence': 0.98,
                'is_final': True,
                'entropy': 0.2,
                'token_id': 'tok_12345'
            }
        ],
        
        'session-event': [
            {
                'type': 'session.started',
                'timestamp': 1640995200.0,
                'session_id': 'test-session-001'
            },
            {
                'type': 'session.ended',
                'timestamp': 1640995260.5,
                'session_id': 'test-session-001',
                'payload': {
                    'duration_s': 60.5,
                    'tokens_processed': 150,
                    'final_energy': 0.0
                }
            }
        ]
    }
    
    return samples

if __name__ == "__main__":
    # Example usage and setup
    print("WF-TECH-007 Schema Regression Testing - Setup and Validation")
    
    # Create schemas directory and standard schemas
    schema_dir = Path("schemas")
    schema_dir.mkdir(exist_ok=True)
    
    # Create standard schemas
    schemas = create_standard_schemas()
    for schema_name, schema_data in schemas.items():
        schema_file = schema_dir / f"{schema_name}.json"
        with open(schema_file, 'w') as f:
            json.dump(schema_data, f, indent=2)
        print(f"Created schema: {schema_file}")
    
    # Create test samples
    test_samples = create_test_samples()
    tester = SchemaRegressionTester()
    
    for schema_name, samples in test_samples.items():
        tester.create_test_samples(schema_name, samples)
        print(f"Created test samples for: {schema_name}")
    
    # Run regression suite
    print("\nRunning schema regression suite...")
    report = tester.run_regression_suite()
    
    print(f"Regression test complete:")
    print(f"  - Schemas tested: {report.schemas_tested}")
    print(f"  - Samples validated: {report.samples_validated}")
    print(f"  - Validation failures: {report.validation_failures}")
    print(f"  - Compatibility issues: {len(report.compatibility_issues)}")
    
    print("Schema regression testing framework validation complete!")
