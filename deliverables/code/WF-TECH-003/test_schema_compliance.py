"""
WIRTHFORGE WebSocket Schema Compliance Test Suite
WF-TECH-003 Message Validation

Tests all WebSocket messages against JSON Schema definitions.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, List, Any
import websockets
import jsonschema
from jsonschema import validate, ValidationError
import pytest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SchemaComplianceTester:
    """WebSocket message schema validation tester"""
    
    def __init__(self, server_url: str = "ws://127.0.0.1:8145/ws", 
                 schema_path: str = None):
        self.server_url = server_url
        self.schema_path = schema_path or self._find_schema_file()
        self.schemas = {}
        self.validation_errors = []
        self.message_counts = {}
        
    def _find_schema_file(self) -> str:
        """Find the schema file in the project structure"""
        possible_paths = [
            "../../assets/schemas/WF-TECH-003-event-schemas.json",
            "../../../assets/schemas/WF-TECH-003-event-schemas.json",
            "WF-TECH-003-event-schemas.json"
        ]
        
        for path in possible_paths:
            if Path(path).exists():
                return path
        
        raise FileNotFoundError("Could not find WF-TECH-003-event-schemas.json")
    
    def load_schemas(self):
        """Load JSON schemas from file"""
        try:
            with open(self.schema_path, 'r') as f:
                schema_data = json.load(f)
            
            # Extract individual schemas
            self.schemas = schema_data.get('schemas', {})
            logger.info(f"Loaded {len(self.schemas)} schemas")
            
        except Exception as e:
            logger.error(f"Failed to load schemas: {e}")
            raise
    
    def validate_message(self, message: Dict[str, Any]) -> bool:
        """Validate a single message against appropriate schema"""
        msg_type = message.get('type')
        if not msg_type:
            self.validation_errors.append({
                'error': 'Missing message type',
                'message': message
            })
            return False
        
        # Map message types to schema names
        schema_map = {
            'startup_complete': 'startupCompleteEvent',
            'energy_update': 'energyUpdateEvent',
            'energy_field': 'energyFieldEvent',
            'token_stream': 'tokenStreamEvent',
            'interference_event': 'interferenceEvent',
            'resonance_event': 'resonanceEvent',
            'reward_event': 'rewardEvent',
            'heartbeat': 'heartbeatEvent',
            'error_event': 'errorEvent'
        }
        
        schema_name = schema_map.get(msg_type)
        if not schema_name:
            self.validation_errors.append({
                'error': f'Unknown message type: {msg_type}',
                'message': message
            })
            return False
        
        schema = self.schemas.get(schema_name)
        if not schema:
            self.validation_errors.append({
                'error': f'Schema not found: {schema_name}',
                'message': message
            })
            return False
        
        try:
            validate(instance=message, schema=schema)
            self.message_counts[msg_type] = self.message_counts.get(msg_type, 0) + 1
            return True
            
        except ValidationError as e:
            self.validation_errors.append({
                'error': f'Schema validation failed: {e.message}',
                'path': e.absolute_path,
                'message': message,
                'schema': schema_name
            })
            return False
    
    async def test_live_messages(self, duration_seconds: int = 30) -> Dict[str, Any]:
        """Connect to server and validate live messages"""
        logger.info(f"Testing schema compliance for {duration_seconds}s...")
        
        self.load_schemas()
        
        try:
            websocket = await asyncio.wait_for(
                websockets.connect(self.server_url),
                timeout=5.0
            )
            logger.info("Connected to WebSocket server")
            
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return {'success': False, 'error': str(e)}
        
        start_time = asyncio.get_event_loop().time()
        end_time = start_time + duration_seconds
        total_messages = 0
        valid_messages = 0
        
        try:
            while asyncio.get_event_loop().time() < end_time:
                try:
                    message_text = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    message = json.loads(message_text)
                    total_messages += 1
                    
                    if self.validate_message(message):
                        valid_messages += 1
                    
                except asyncio.TimeoutError:
                    continue
                except json.JSONDecodeError as e:
                    self.validation_errors.append({
                        'error': f'JSON decode error: {e}',
                        'raw_message': message_text
                    })
        
        finally:
            await websocket.close()
        
        success_rate = (valid_messages / total_messages * 100) if total_messages > 0 else 0
        
        results = {
            'success': len(self.validation_errors) == 0,
            'total_messages': total_messages,
            'valid_messages': valid_messages,
            'success_rate': success_rate,
            'message_counts': self.message_counts,
            'validation_errors': self.validation_errors
        }
        
        logger.info(f"Schema compliance results:")
        logger.info(f"  Total messages: {total_messages}")
        logger.info(f"  Valid messages: {valid_messages}")
        logger.info(f"  Success rate: {success_rate:.1f}%")
        logger.info(f"  Validation errors: {len(self.validation_errors)}")
        
        return results
    
    def test_sample_messages(self) -> Dict[str, Any]:
        """Test predefined sample messages"""
        self.load_schemas()
        
        # Sample messages for testing
        sample_messages = [
            {
                "type": "startup_complete",
                "channel": "system",
                "timestamp": 1692300000000,
                "payload": {
                    "model": "LLaMA2-13B",
                    "tier": "Mid-Tier",
                    "version": "1.0.0",
                    "frameRate": 60,
                    "capabilities": ["visualization", "council"]
                }
            },
            {
                "type": "energy_update",
                "channel": "energy",
                "timestamp": 1692300001000,
                "frameNumber": 60,
                "payload": {
                    "totalEnergy": 1250.5,
                    "deltaEnergy": 15.5,
                    "tokensGenerated": 2,
                    "processingTime": 12.3,
                    "modelId": "llama2-13b",
                    "energyDistribution": {
                        "generation": 750.3,
                        "attention": 375.15,
                        "reasoning": 125.05
                    }
                }
            },
            {
                "type": "token_stream",
                "channel": "experience",
                "timestamp": 1692300002000,
                "payload": {
                    "tokens": ["Hello", "world"],
                    "isComplete": false,
                    "sessionId": "session_123",
                    "modelId": "llama2-13b",
                    "energyCost": 25.5
                }
            },
            {
                "type": "heartbeat",
                "channel": "system",
                "timestamp": 1692300003000,
                "payload": {
                    "sequence": 123,
                    "serverTime": 1692300003000,
                    "frameRate": 59.8
                }
            }
        ]
        
        valid_count = 0
        for message in sample_messages:
            if self.validate_message(message):
                valid_count += 1
        
        return {
            'success': len(self.validation_errors) == 0,
            'total_samples': len(sample_messages),
            'valid_samples': valid_count,
            'validation_errors': self.validation_errors
        }

# Pytest test functions
@pytest.mark.asyncio
async def test_live_message_schema_compliance():
    """Test that all live messages comply with schemas"""
    tester = SchemaComplianceTester()
    results = await tester.test_live_messages(duration_seconds=15)
    
    assert results['success'], f"Schema validation failed with {len(results['validation_errors'])} errors"
    assert results['success_rate'] >= 95.0, f"Success rate {results['success_rate']:.1f}% below 95% threshold"

def test_sample_message_schemas():
    """Test predefined sample messages against schemas"""
    tester = SchemaComplianceTester()
    results = tester.test_sample_messages()
    
    assert results['success'], f"Sample validation failed: {results['validation_errors']}"
    assert results['valid_samples'] == results['total_samples'], "Not all sample messages passed validation"

def test_schema_loading():
    """Test that schemas load correctly"""
    tester = SchemaComplianceTester()
    tester.load_schemas()
    
    expected_schemas = [
        'startupCompleteEvent',
        'energyUpdateEvent',
        'tokenStreamEvent',
        'heartbeatEvent',
        'errorEvent'
    ]
    
    for schema_name in expected_schemas:
        assert schema_name in tester.schemas, f"Missing schema: {schema_name}"

if __name__ == "__main__":
    async def run_manual_tests():
        """Run tests manually for development"""
        tester = SchemaComplianceTester()
        
        print("🧬 WIRTHFORGE WebSocket Schema Compliance Test")
        print("=" * 50)
        
        try:
            # Test sample messages
            print("\n1. Testing sample message schemas...")
            sample_results = tester.test_sample_messages()
            
            print(f"   ✓ Sample messages: {sample_results['valid_samples']}/{sample_results['total_samples']}")
            if sample_results['validation_errors']:
                print("   ❌ Validation errors:")
                for error in sample_results['validation_errors']:
                    print(f"      - {error['error']}")
            else:
                print("   ✅ All sample messages valid")
            
            # Test live messages
            print("\n2. Testing live message compliance...")
            live_results = await tester.test_live_messages(duration_seconds=20)
            
            print(f"   ✓ Messages tested: {live_results['total_messages']}")
            print(f"   ✓ Success rate: {live_results['success_rate']:.1f}%")
            print(f"   ✓ Message types: {list(live_results['message_counts'].keys())}")
            
            if live_results['validation_errors']:
                print("   ❌ Validation errors:")
                for error in live_results['validation_errors'][:5]:  # Show first 5
                    print(f"      - {error['error']}")
                if len(live_results['validation_errors']) > 5:
                    print(f"      ... and {len(live_results['validation_errors']) - 5} more")
            else:
                print("   ✅ All live messages valid")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
    
    # Run manual tests
    asyncio.run(run_manual_tests())
