"""
WF-TECH-005 WebSocket Integration Module
Real-time streaming of Decipher events to web clients

This module provides WebSocket server functionality for streaming Decipher
energy events to web clients at 60Hz with backpressure handling and
connection management.

Author: WIRTHFORGE Development Team
Version: 1.0
License: MIT
"""

import asyncio
import json
import logging
import time
import weakref
from typing import Dict, List, Optional, Set, Callable, Any
from dataclasses import dataclass, asdict
from enum import Enum
import websockets
from websockets.server import WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed, WebSocketException

logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    """WebSocket connection states"""
    CONNECTING = "connecting"
    ACTIVE = "active"
    DEGRADED = "degraded"
    CLOSING = "closing"
    CLOSED = "closed"


@dataclass
class ConnectionMetrics:
    """Metrics for a WebSocket connection"""
    connected_at: float
    messages_sent: int = 0
    messages_failed: int = 0
    bytes_sent: int = 0
    last_ping: float = 0
    avg_latency_ms: float = 0
    queue_depth: int = 0
    state: ConnectionState = ConnectionState.CONNECTING


@dataclass
class WebSocketConfig:
    """Configuration for WebSocket server"""
    host: str = "localhost"
    port: int = 8765
    max_connections: int = 100
    max_queue_size: int = 1000
    ping_interval: float = 30.0
    ping_timeout: float = 10.0
    compression: str = "deflate"
    max_message_size: int = 1024 * 1024  # 1MB
    enable_heartbeat: bool = True
    heartbeat_interval: float = 5.0


class WebSocketConnection:
    """Manages individual WebSocket connection with backpressure handling"""
    
    def __init__(self, websocket: WebSocketServerProtocol, connection_id: str):
        self.websocket = websocket
        self.connection_id = connection_id
        self.metrics = ConnectionMetrics(connected_at=time.time())
        self.message_queue: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self.send_task: Optional[asyncio.Task] = None
        self.subscriptions: Set[str] = set()
        self.client_info: Dict[str, Any] = {}
        
    async def start(self):
        """Start the connection message sender task"""
        self.send_task = asyncio.create_task(self._message_sender())
        self.metrics.state = ConnectionState.ACTIVE
        
    async def stop(self):
        """Stop the connection and cleanup"""
        self.metrics.state = ConnectionState.CLOSING
        if self.send_task:
            self.send_task.cancel()
            try:
                await self.send_task
            except asyncio.CancelledError:
                pass
        self.metrics.state = ConnectionState.CLOSED
        
    async def send_event(self, event: Dict[str, Any]) -> bool:
        """Send event to client with backpressure handling"""
        try:
            # Check if client is subscribed to this event type
            event_type = event.get('type', '')
            if self.subscriptions and event_type not in self.subscriptions:
                return True  # Skip unsubscribed events
                
            # Apply backpressure if queue is full
            if self.message_queue.full():
                if self.metrics.state == ConnectionState.ACTIVE:
                    self.metrics.state = ConnectionState.DEGRADED
                    logger.warning(f"Connection {self.connection_id} entering degraded mode")
                
                # Drop oldest non-critical events
                if event_type not in ['system.error', 'session.end']:
                    try:
                        self.message_queue.get_nowait()  # Drop oldest
                    except asyncio.QueueEmpty:
                        pass
                        
            await self.message_queue.put(event)
            self.metrics.queue_depth = self.message_queue.qsize()
            return True
            
        except Exception as e:
            logger.error(f"Failed to queue event for {self.connection_id}: {e}")
            return False
            
    async def _message_sender(self):
        """Background task to send queued messages"""
        try:
            while True:
                event = await self.message_queue.get()
                
                try:
                    message = json.dumps(event)
                    await self.websocket.send(message)
                    
                    self.metrics.messages_sent += 1
                    self.metrics.bytes_sent += len(message)
                    self.metrics.queue_depth = self.message_queue.qsize()
                    
                    # Return to active state if queue is manageable
                    if (self.metrics.state == ConnectionState.DEGRADED and 
                        self.metrics.queue_depth < 100):
                        self.metrics.state = ConnectionState.ACTIVE
                        
                except (ConnectionClosed, WebSocketException):
                    logger.info(f"Connection {self.connection_id} closed")
                    break
                except Exception as e:
                    self.metrics.messages_failed += 1
                    logger.error(f"Failed to send message to {self.connection_id}: {e}")
                    
        except asyncio.CancelledError:
            logger.debug(f"Message sender cancelled for {self.connection_id}")
            
    def subscribe(self, event_types: List[str]):
        """Subscribe to specific event types"""
        self.subscriptions.update(event_types)
        
    def unsubscribe(self, event_types: List[str]):
        """Unsubscribe from specific event types"""
        self.subscriptions.difference_update(event_types)
        
    def set_client_info(self, info: Dict[str, Any]):
        """Set client information"""
        self.client_info.update(info)


class DecipherWebSocketServer:
    """WebSocket server for streaming Decipher events"""
    
    def __init__(self, config: WebSocketConfig = None):
        self.config = config or WebSocketConfig()
        self.connections: Dict[str, WebSocketConnection] = {}
        self.server: Optional[websockets.WebSocketServer] = None
        self.running = False
        self.event_callbacks: Dict[str, List[Callable]] = {}
        self.stats = {
            'total_connections': 0,
            'active_connections': 0,
            'events_sent': 0,
            'events_failed': 0,
            'bytes_sent': 0,
            'uptime_start': 0
        }
        
    async def start(self) -> bool:
        """Start the WebSocket server"""
        try:
            self.server = await websockets.serve(
                self._handle_connection,
                self.config.host,
                self.config.port,
                ping_interval=self.config.ping_interval,
                ping_timeout=self.config.ping_timeout,
                compression=self.config.compression,
                max_size=self.config.max_message_size
            )
            
            self.running = True
            self.stats['uptime_start'] = time.time()
            
            # Start heartbeat task if enabled
            if self.config.enable_heartbeat:
                asyncio.create_task(self._heartbeat_task())
                
            logger.info(f"WebSocket server started on {self.config.host}:{self.config.port}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            return False
            
    async def stop(self):
        """Stop the WebSocket server"""
        self.running = False
        
        # Close all connections
        close_tasks = []
        for connection in list(self.connections.values()):
            close_tasks.append(connection.stop())
            
        if close_tasks:
            await asyncio.gather(*close_tasks, return_exceptions=True)
            
        # Close server
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            
        logger.info("WebSocket server stopped")
        
    async def broadcast_event(self, event: Dict[str, Any]) -> int:
        """Broadcast event to all connected clients"""
        if not self.connections:
            return 0
            
        send_tasks = []
        for connection in self.connections.values():
            if connection.metrics.state in [ConnectionState.ACTIVE, ConnectionState.DEGRADED]:
                send_tasks.append(connection.send_event(event))
                
        if send_tasks:
            results = await asyncio.gather(*send_tasks, return_exceptions=True)
            success_count = sum(1 for result in results if result is True)
            
            self.stats['events_sent'] += success_count
            self.stats['events_failed'] += len(results) - success_count
            
            return success_count
            
        return 0
        
    async def send_to_connection(self, connection_id: str, event: Dict[str, Any]) -> bool:
        """Send event to specific connection"""
        connection = self.connections.get(connection_id)
        if connection and connection.metrics.state in [ConnectionState.ACTIVE, ConnectionState.DEGRADED]:
            success = await connection.send_event(event)
            if success:
                self.stats['events_sent'] += 1
            else:
                self.stats['events_failed'] += 1
            return success
        return False
        
    def register_event_callback(self, event_type: str, callback: Callable):
        """Register callback for specific event types"""
        if event_type not in self.event_callbacks:
            self.event_callbacks[event_type] = []
        self.event_callbacks[event_type].append(callback)
        
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get server and connection statistics"""
        active_connections = sum(
            1 for conn in self.connections.values()
            if conn.metrics.state in [ConnectionState.ACTIVE, ConnectionState.DEGRADED]
        )
        
        total_messages = sum(conn.metrics.messages_sent for conn in self.connections.values())
        total_bytes = sum(conn.metrics.bytes_sent for conn in self.connections.values())
        
        uptime = time.time() - self.stats['uptime_start'] if self.stats['uptime_start'] else 0
        
        return {
            'server': {
                'running': self.running,
                'uptime_seconds': uptime,
                'host': self.config.host,
                'port': self.config.port
            },
            'connections': {
                'active': active_connections,
                'total': len(self.connections),
                'max_allowed': self.config.max_connections
            },
            'traffic': {
                'messages_sent': total_messages,
                'bytes_sent': total_bytes,
                'events_sent': self.stats['events_sent'],
                'events_failed': self.stats['events_failed']
            },
            'performance': {
                'avg_queue_depth': sum(conn.metrics.queue_depth for conn in self.connections.values()) / max(len(self.connections), 1),
                'degraded_connections': sum(1 for conn in self.connections.values() if conn.metrics.state == ConnectionState.DEGRADED)
            }
        }
        
    async def _handle_connection(self, websocket: WebSocketServerProtocol, path: str):
        """Handle new WebSocket connection"""
        connection_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}:{int(time.time() * 1000)}"
        
        # Check connection limit
        if len(self.connections) >= self.config.max_connections:
            await websocket.close(code=1013, reason="Server at capacity")
            return
            
        connection = WebSocketConnection(websocket, connection_id)
        self.connections[connection_id] = connection
        self.stats['total_connections'] += 1
        
        logger.info(f"New WebSocket connection: {connection_id}")
        
        try:
            await connection.start()
            
            # Send welcome message
            welcome_event = {
                'id': f"welcome_{int(time.time() * 1000)}",
                'type': 'system.welcome',
                'timestamp': int(time.time() * 1000),
                'payload': {
                    'connection_id': connection_id,
                    'server_version': '1.0',
                    'capabilities': {
                        'max_fps': 60,
                        'supports_subscriptions': True,
                        'supports_backpressure': True
                    }
                }
            }
            await connection.send_event(welcome_event)
            
            # Handle incoming messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._handle_client_message(connection, data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from {connection_id}")
                except Exception as e:
                    logger.error(f"Error handling message from {connection_id}: {e}")
                    
        except ConnectionClosed:
            logger.info(f"Connection {connection_id} closed normally")
        except Exception as e:
            logger.error(f"Connection {connection_id} error: {e}")
        finally:
            await connection.stop()
            self.connections.pop(connection_id, None)
            logger.info(f"Connection {connection_id} cleaned up")
            
    async def _handle_client_message(self, connection: WebSocketConnection, data: Dict[str, Any]):
        """Handle incoming client messages"""
        message_type = data.get('type')
        
        if message_type == 'subscribe':
            event_types = data.get('event_types', [])
            connection.subscribe(event_types)
            logger.debug(f"Connection {connection.connection_id} subscribed to {event_types}")
            
        elif message_type == 'unsubscribe':
            event_types = data.get('event_types', [])
            connection.unsubscribe(event_types)
            logger.debug(f"Connection {connection.connection_id} unsubscribed from {event_types}")
            
        elif message_type == 'client_info':
            connection.set_client_info(data.get('info', {}))
            logger.debug(f"Connection {connection.connection_id} updated client info")
            
        elif message_type == 'ping':
            # Respond with pong
            pong_event = {
                'id': f"pong_{int(time.time() * 1000)}",
                'type': 'pong',
                'timestamp': int(time.time() * 1000),
                'payload': {'ping_id': data.get('id')}
            }
            await connection.send_event(pong_event)
            
        # Trigger event callbacks
        callbacks = self.event_callbacks.get(message_type, [])
        for callback in callbacks:
            try:
                await callback(connection, data)
            except Exception as e:
                logger.error(f"Event callback error: {e}")
                
    async def _heartbeat_task(self):
        """Send periodic heartbeat to all connections"""
        while self.running:
            try:
                heartbeat_event = {
                    'id': f"heartbeat_{int(time.time() * 1000)}",
                    'type': 'system.heartbeat',
                    'timestamp': int(time.time() * 1000),
                    'payload': {
                        'status': 'alive',
                        'uptime_ms': int((time.time() - self.stats['uptime_start']) * 1000),
                        'stats': {
                            'active_connections': len([
                                c for c in self.connections.values()
                                if c.metrics.state in [ConnectionState.ACTIVE, ConnectionState.DEGRADED]
                            ]),
                            'events_sent': self.stats['events_sent'],
                            'current_fps': 60  # This would be updated by Decipher loop
                        }
                    }
                }
                
                await self.broadcast_event(heartbeat_event)
                await asyncio.sleep(self.config.heartbeat_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat task error: {e}")
                await asyncio.sleep(1)


# Integration with Decipher Loop
class DecipherWebSocketIntegration:
    """Integration layer between Decipher loop and WebSocket server"""
    
    def __init__(self, websocket_server: DecipherWebSocketServer):
        self.websocket_server = websocket_server
        self.event_buffer: List[Dict[str, Any]] = []
        self.last_broadcast = 0
        self.broadcast_interval = 1.0 / 60  # 60 FPS
        
    async def on_energy_update(self, event_data: Dict[str, Any]):
        """Handle energy update events from Decipher"""
        await self.websocket_server.broadcast_event(event_data)
        
    async def on_token_event(self, event_data: Dict[str, Any]):
        """Handle token events from Decipher"""
        await self.websocket_server.broadcast_event(event_data)
        
    async def on_pattern_event(self, event_data: Dict[str, Any]):
        """Handle pattern events (interference/resonance) from Decipher"""
        await self.websocket_server.broadcast_event(event_data)
        
    async def on_session_event(self, event_data: Dict[str, Any]):
        """Handle session lifecycle events from Decipher"""
        await self.websocket_server.broadcast_event(event_data)
        
    async def on_error_event(self, event_data: Dict[str, Any]):
        """Handle error events from Decipher"""
        await self.websocket_server.broadcast_event(event_data)


# Example usage and testing
async def main():
    """Example usage of WebSocket server with Decipher integration"""
    
    # Configure server
    config = WebSocketConfig(
        host="localhost",
        port=8765,
        max_connections=50,
        enable_heartbeat=True,
        heartbeat_interval=5.0
    )
    
    # Create and start server
    server = DecipherWebSocketServer(config)
    integration = DecipherWebSocketIntegration(server)
    
    try:
        await server.start()
        print(f"WebSocket server running on ws://{config.host}:{config.port}")
        
        # Simulate Decipher events
        frame_id = 0
        while True:
            # Simulate energy update event
            energy_event = {
                'id': f"energy_{frame_id}",
                'type': 'energy.update',
                'timestamp': int(time.time() * 1000),
                'payload': {
                    'frame_id': frame_id,
                    'new_tokens': 2,
                    'energy_generated': 1.5,
                    'total_energy': frame_id * 1.5,
                    'energy_rate': 90.0,
                    'state': 'FLOWING',
                    'queue_depth': 5,
                    'processing_time_ms': 12.3
                }
            }
            
            await integration.on_energy_update(energy_event)
            
            # Print stats every 5 seconds
            if frame_id % 300 == 0:  # Every 5 seconds at 60 FPS
                stats = server.get_connection_stats()
                print(f"Stats: {stats['connections']['active']} active connections, "
                      f"{stats['traffic']['events_sent']} events sent")
                      
            frame_id += 1
            await asyncio.sleep(1/60)  # 60 FPS
            
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        await server.stop()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
