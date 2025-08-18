"""
WIRTHFORGE WebSocket Server Implementation
WF-TECH-003 Real-Time Protocol Reference Implementation

FastAPI WebSocket server providing 60Hz real-time communication
between WIRTHFORGE orchestrator and browser UI.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ConnectionState:
    """WebSocket connection state management"""
    websocket: WebSocket
    connection_id: str
    connected_at: float
    last_heartbeat: float
    frame_count: int = 0
    
class WirthForgeWebSocketServer:
    """WIRTHFORGE Real-Time WebSocket Protocol Server"""
    
    def __init__(self):
        self.app = FastAPI(title="WIRTHFORGE WebSocket Server")
        self.connections: Dict[str, ConnectionState] = {}
        self.frame_number = 0
        self.running = False
        self.heartbeat_interval = 1.0  # seconds
        self.frame_rate = 60  # Hz
        self.frame_budget_ms = 16.67  # milliseconds per frame
        
        # Configure CORS for local development
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Register WebSocket endpoint
        self.app.websocket("/ws")(self.websocket_endpoint)
        
    async def websocket_endpoint(self, websocket: WebSocket):
        """Main WebSocket endpoint handler"""
        connection_id = f"conn_{int(time.time() * 1000)}"
        
        try:
            await websocket.accept()
            logger.info(f"Client connected: {connection_id}")
            
            # Create connection state
            connection = ConnectionState(
                websocket=websocket,
                connection_id=connection_id,
                connected_at=time.time(),
                last_heartbeat=time.time()
            )
            self.connections[connection_id] = connection
            
            # Send startup handshake
            await self.send_startup_complete(connection)
            
            # Handle incoming messages (minimal for this protocol)
            async for message in websocket.iter_text():
                await self.handle_client_message(connection, message)
                
        except WebSocketDisconnect:
            logger.info(f"Client disconnected: {connection_id}")
        except Exception as e:
            logger.error(f"WebSocket error for {connection_id}: {e}")
            await self.send_error_event(connection, "WEBSOCKET_ERROR", str(e))
        finally:
            if connection_id in self.connections:
                del self.connections[connection_id]
    
    async def send_startup_complete(self, connection: ConnectionState):
        """Send startup_complete handshake event"""
        event = {
            "type": "startup_complete",
            "channel": "system",
            "timestamp": int(time.time() * 1000),
            "payload": {
                "model": "LLaMA2-13B",
                "tier": "Mid-Tier",
                "version": "1.0.0",
                "capabilities": ["visualization", "council"],
                "frameRate": self.frame_rate
            }
        }
        await self.send_event(connection, event)
    
    async def handle_client_message(self, connection: ConnectionState, message: str):
        """Handle incoming client messages (minimal implementation)"""
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "heartbeat_response":
                connection.last_heartbeat = time.time()
                logger.debug(f"Heartbeat response from {connection.connection_id}")
            else:
                logger.warning(f"Unknown message type: {msg_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from {connection.connection_id}: {message}")
    
    async def send_event(self, connection: ConnectionState, event: dict):
        """Send event to specific connection with error handling"""
        try:
            start_time = time.perf_counter()
            await connection.websocket.send_text(json.dumps(event))
            send_time = (time.perf_counter() - start_time) * 1000
            
            # Log if send time exceeds frame budget
            if send_time > self.frame_budget_ms:
                logger.warning(f"Send time {send_time:.2f}ms exceeds frame budget")
                
        except Exception as e:
            logger.error(f"Failed to send event to {connection.connection_id}: {e}")
            # Remove failed connection
            if connection.connection_id in self.connections:
                del self.connections[connection.connection_id]
    
    async def broadcast_event(self, event: dict):
        """Broadcast event to all connected clients"""
        if not self.connections:
            return
            
        # Send to all connections concurrently
        tasks = [
            self.send_event(conn, event) 
            for conn in self.connections.values()
        ]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def send_energy_update(self, total_energy: float, delta_energy: float, 
                               tokens_generated: int, processing_time: float):
        """Send energy_update event for 60Hz visualization"""
        event = {
            "type": "energy_update",
            "channel": "energy",
            "timestamp": int(time.time() * 1000),
            "frameNumber": self.frame_number,
            "payload": {
                "totalEnergy": total_energy,
                "deltaEnergy": delta_energy,
                "tokensGenerated": tokens_generated,
                "processingTime": processing_time,
                "modelId": "llama2-13b",
                "energyDistribution": {
                    "generation": total_energy * 0.6,
                    "attention": total_energy * 0.3,
                    "reasoning": total_energy * 0.1
                }
            }
        }
        await self.broadcast_event(event)
    
    async def send_token_stream(self, tokens: List[str], is_complete: bool, 
                              session_id: str, energy_cost: float):
        """Send token_stream event for user experience"""
        event = {
            "type": "token_stream",
            "channel": "experience",
            "timestamp": int(time.time() * 1000),
            "payload": {
                "tokens": tokens,
                "isComplete": is_complete,
                "sessionId": session_id,
                "modelId": "llama2-13b",
                "energyCost": energy_cost
            }
        }
        await self.broadcast_event(event)
    
    async def send_error_event(self, connection: ConnectionState, code: str, message: str):
        """Send error_event for error reporting"""
        event = {
            "type": "error_event",
            "channel": "system",
            "timestamp": int(time.time() * 1000),
            "payload": {
                "severity": "error",
                "code": code,
                "message": message,
                "component": "websocket",
                "recoverable": True
            }
        }
        await self.send_event(connection, event)
    
    async def heartbeat_loop(self):
        """Background heartbeat loop"""
        sequence = 0
        while self.running:
            if self.connections:
                event = {
                    "type": "heartbeat",
                    "channel": "system",
                    "timestamp": int(time.time() * 1000),
                    "payload": {
                        "sequence": sequence,
                        "serverTime": int(time.time() * 1000),
                        "frameRate": self.frame_rate
                    }
                }
                await self.broadcast_event(event)
                sequence += 1
            
            await asyncio.sleep(self.heartbeat_interval)
    
    async def frame_loop(self):
        """Main 60Hz frame processing loop"""
        frame_interval = 1.0 / self.frame_rate
        
        while self.running:
            frame_start = time.perf_counter()
            
            # Simulate DECIPHER energy processing
            total_energy = 1000 + (self.frame_number % 100) * 10
            delta_energy = 15.5 if self.frame_number % 4 == 0 else 0
            tokens_generated = 1 if self.frame_number % 8 == 0 else 0
            processing_time = (time.perf_counter() - frame_start) * 1000
            
            # Send energy update
            await self.send_energy_update(
                total_energy, delta_energy, tokens_generated, processing_time
            )
            
            self.frame_number += 1
            
            # Maintain 60Hz timing
            frame_time = time.perf_counter() - frame_start
            sleep_time = max(0, frame_interval - frame_time)
            
            if frame_time > frame_interval:
                logger.warning(f"Frame {self.frame_number} overrun: {frame_time*1000:.2f}ms")
            
            await asyncio.sleep(sleep_time)
    
    async def start_background_tasks(self):
        """Start background processing tasks"""
        self.running = True
        
        # Start heartbeat and frame loops
        heartbeat_task = asyncio.create_task(self.heartbeat_loop())
        frame_task = asyncio.create_task(self.frame_loop())
        
        return heartbeat_task, frame_task
    
    def stop(self):
        """Stop background processing"""
        self.running = False

# Global server instance
server = WirthForgeWebSocketServer()

@server.app.on_event("startup")
async def startup_event():
    """Start background tasks on server startup"""
    await server.start_background_tasks()
    logger.info("WIRTHFORGE WebSocket Server started")

@server.app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown"""
    server.stop()
    logger.info("WIRTHFORGE WebSocket Server stopped")

if __name__ == "__main__":
    # Run server for development
    uvicorn.run(
        "ws_server:server.app",
        host="127.0.0.1",
        port=8145,
        log_level="info",
        reload=False  # Disable reload for WebSocket stability
    )
