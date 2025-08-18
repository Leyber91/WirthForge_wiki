# fastapi_config.py
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

def create_app():
    app = FastAPI(
        title="WIRTHFORGE Local API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # CORS for local web UI
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return app

# Server configuration
SERVER_CONFIG = {
    "host": "127.0.0.1",
    "port": 8145,
    "log_level": "info",
    "access_log": False,
    "server_header": False,
    "date_header": False
}

def start_server():
    app = create_app()
    uvicorn.run(app, **SERVER_CONFIG)
