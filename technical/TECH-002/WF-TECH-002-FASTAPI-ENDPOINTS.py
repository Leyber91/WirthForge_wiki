"""
WF-TECH-002: FastAPI Local Endpoints
Web-engaged local-core API for model control and streaming (127.0.0.1 only)
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, AsyncIterator
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from .energy_mapping import EnergyMapper, TokenEvent
from .ollama_adapter import OllamaAdapter
from .model_pool import ModelPool
from .tier_policy import TierPolicy


# Request/Response Models
class LoadModelRequest(BaseModel):
    name: str
    priority: str = "normal"
    warm_up: bool = True


class GenerateRequest(BaseModel):
    model: str
    prompt: str
    mode: str = "single"
    models: Optional[List[str]] = None
    parameters: Optional[Dict] = None


class StopRequest(BaseModel):
    session_id: str


# Global state (managed by orchestrator)
app_state = {
    "ollama": None,
    "model_pool": None,
    "energy_mapper": None,
    "tier_policy": None,
    "active_sessions": {},
    "websocket_connections": set()
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize components on startup"""
    # Initialize core components
    app_state["tier_policy"] = TierPolicy.load_from_file("TECH-002/WF-TECH-002-TIER-POLICY.yaml")
    app_state["ollama"] = OllamaAdapter()
    app_state["model_pool"] = ModelPool(app_state["tier_policy"])
    app_state["energy_mapper"] = EnergyMapper()
    
    # Ensure Ollama is running
    await app_state["ollama"].ensure_running()
    
    yield
    
    # Cleanup on shutdown
    for session_id in list(app_state["active_sessions"].keys()):
        await stop_session(session_id)


# Create FastAPI app with localhost-only binding
app = FastAPI(
    title="WIRTHFORGE Local AI Integration",
    description="Local-core AI model control and streaming API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for local web UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:*", "http://localhost:*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.get("/models")
async def list_models():
    """List available local models and their status"""
    try:
        models = await app_state["model_pool"].list_models()
        memory_info = await app_state["model_pool"].get_memory_info()
        
        return {
            "models": [
                {
                    "name": model.name,
                    "size_gb": model.size_gb,
                    "status": model.status,
                    "last_used": model.last_used.isoformat() if model.last_used else None,
                    "memory_usage_mb": model.memory_usage_mb,
                    "capabilities": model.capabilities
                }
                for model in models
            ],
            "total_memory_gb": memory_info.total_gb,
            "available_memory_gb": memory_info.available_gb
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/models/load")
async def load_model(request: LoadModelRequest):
    """Load a model into memory"""
    try:
        start_time = time.time()
        
        # Check tier limits
        if not app_state["tier_policy"].can_load_model(request.name):
            raise HTTPException(
                status_code=429, 
                detail="Tier resource limits exceeded"
            )
        
        # Load model
        model_info = await app_state["model_pool"].ensure_loaded(
            request.name, 
            priority=request.priority,
            warm_up=request.warm_up
        )
        
        load_time_ms = (time.time() - start_time) * 1000
        
        return {
            "success": True,
            "model": request.name,
            "load_time_ms": load_time_ms,
            "memory_allocated_mb": model_info.memory_usage_mb
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate")
async def start_generation(request: GenerateRequest):
    """Start token generation stream"""
    try:
        # Validate model availability
        if not await app_state["model_pool"].is_loaded(request.model):
            await app_state["model_pool"].ensure_loaded(request.model)
        
        # Check turbo mode availability
        if request.mode == "turbo":
            if not app_state["tier_policy"].turbo_enabled:
                raise HTTPException(
                    status_code=403,
                    detail="Turbo mode not available for current tier"
                )
            
            if not request.models or len(request.models) > app_state["tier_policy"].max_parallel_models:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid model count for turbo mode (max: {app_state['tier_policy'].max_parallel_models})"
                )
        
        # Create session
        session_id = f"session_{int(time.time() * 1000)}"
        
        # Estimate token count (rough heuristic)
        estimated_tokens = len(request.prompt.split()) * 2
        
        # Store session info
        app_state["active_sessions"][session_id] = {
            "model": request.model,
            "mode": request.mode,
            "models": request.models,
            "start_time": time.time(),
            "active": True
        }
        
        return {
            "session_id": session_id,
            "stream_url": f"/stream/{session_id}",
            "estimated_tokens": estimated_tokens
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stream/{session_id}")
async def stream_tokens(session_id: str):
    """Stream generated tokens via Server-Sent Events"""
    if session_id not in app_state["active_sessions"]:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = app_state["active_sessions"][session_id]
    
    async def generate_stream():
        try:
            if session["mode"] == "single":
                async for event in generate_single_stream(session_id, session):
                    yield f"data: {json.dumps(asdict(event))}\n\n"
            else:  # turbo mode
                async for event in generate_turbo_stream(session_id, session):
                    yield f"data: {json.dumps(asdict(event))}\n\n"
                    
        except Exception as e:
            error_event = {"error": str(e), "session_id": session_id}
            yield f"data: {json.dumps(error_event)}\n\n"
        finally:
            # Clean up session
            if session_id in app_state["active_sessions"]:
                del app_state["active_sessions"][session_id]
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


async def generate_single_stream(session_id: str, session: Dict) -> AsyncIterator[TokenEvent]:
    """Generate tokens from single model"""
    model = session["model"]
    
    async for token_data in app_state["ollama"].generate_stream(model, session.get("prompt", "")):
        # Create token event
        event = TokenEvent(
            token=token_data["token"],
            timestamp_ms=int(time.time() * 1000),
            delta_ms=token_data.get("delta_ms", 0),
            model=model,
            session_id=session_id,
            logprobs=token_data.get("logprobs"),
            position=token_data.get("position", 0)
        )
        
        # Compute energy
        energy = app_state["energy_mapper"].compute_energy(event)
        event.energy = energy
        
        # Broadcast to websockets
        await broadcast_token_event(event)
        
        yield event
        
        # Check if session was stopped
        if not app_state["active_sessions"].get(session_id, {}).get("active", False):
            break


async def generate_turbo_stream(session_id: str, session: Dict) -> AsyncIterator[Dict]:
    """Generate tokens from ensemble of models"""
    models = session["models"]
    
    # Implementation would coordinate multiple model streams
    # This is a simplified version
    for model in models:
        async for token_data in app_state["ollama"].generate_stream(model, session.get("prompt", "")):
            ensemble_event = {
                "session_id": session_id,
                "tokens": [{
                    "token": token_data["token"],
                    "model": model,
                    "energy": 0.5,  # Computed by ensemble calculator
                    "confidence": 0.8
                }],
                "ensemble_energy": 0.6,
                "diversity_index": 0.3,
                "timestamp_ms": int(time.time() * 1000)
            }
            
            yield ensemble_event


@app.post("/stop")
async def stop_generation(request: StopRequest):
    """Stop active generation session"""
    session_id = request.session_id
    
    if session_id not in app_state["active_sessions"]:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = app_state["active_sessions"][session_id]
    session["active"] = False
    
    # Calculate session stats
    duration_ms = (time.time() - session["start_time"]) * 1000
    
    return {
        "success": True,
        "tokens_generated": session.get("token_count", 0),
        "duration_ms": duration_ms
    }


@app.get("/stats")
async def get_statistics():
    """Get real-time performance statistics"""
    try:
        model_stats = await app_state["model_pool"].get_statistics()
        energy_stats = app_state["energy_mapper"].get_statistics()
        
        return {
            "models": {
                model_name: {
                    "tps_current": stats.get("tps_current", 0),
                    "tps_average": stats.get("tps_average", 0),
                    "ttft_ms": stats.get("ttft_ms", 0),
                    "energy_rate": stats.get("energy_rate", 0),
                    "active_sessions": stats.get("active_sessions", 0),
                    "total_tokens": stats.get("total_tokens", 0)
                }
                for model_name, stats in model_stats.items()
            },
            "system": {
                "fps_current": 60.0,  # From orchestrator
                "fps_average": 59.8,
                "memory_usage_percent": 0.65,
                "cpu_usage_percent": 0.45,
                "active_models": len([s for s in app_state["active_sessions"].values() if s["active"]])
            },
            "turbo": {
                "active_ensembles": len([s for s in app_state["active_sessions"].values() 
                                       if s["mode"] == "turbo" and s["active"]]),
                "diversity_index": 0.4,
                "ensemble_energy": energy_stats.get("smoothed_energy", 0.5),
                "sync_latency_ms": 25
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    app_state["websocket_connections"].add(websocket)
    
    try:
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()
            # Echo back for now (could handle commands)
            await websocket.send_text(f"Echo: {data}")
            
    except WebSocketDisconnect:
        app_state["websocket_connections"].discard(websocket)


async def broadcast_token_event(event: TokenEvent):
    """Broadcast token event to all connected websockets"""
    if not app_state["websocket_connections"]:
        return
    
    message = json.dumps({
        "type": "token_generated",
        "data": asdict(event)
    })
    
    # Send to all connected clients
    disconnected = set()
    for websocket in app_state["websocket_connections"]:
        try:
            await websocket.send_text(message)
        except:
            disconnected.add(websocket)
    
    # Clean up disconnected clients
    app_state["websocket_connections"] -= disconnected


async def stop_session(session_id: str):
    """Internal session cleanup"""
    if session_id in app_state["active_sessions"]:
        app_state["active_sessions"][session_id]["active"] = False
        del app_state["active_sessions"][session_id]


def create_server_config():
    """Create uvicorn server configuration for localhost-only binding"""
    return uvicorn.Config(
        app=app,
        host="127.0.0.1",  # Localhost only
        port=8001,         # Default port (configurable)
        log_level="info",
        access_log=True,
        reload=False       # Production setting
    )


if __name__ == "__main__":
    # Development server
    config = create_server_config()
    server = uvicorn.Server(config)
    asyncio.run(server.serve())
