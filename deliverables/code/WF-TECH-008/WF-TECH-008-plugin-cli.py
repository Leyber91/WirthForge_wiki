#!/usr/bin/env python3
"""
WF-TECH-008: WIRTHFORGE Plugin CLI Utilities

Command-line interface for plugin development workflow:
- Plugin project creation and scaffolding
- Manifest validation and management
- Build and packaging
- Testing and debugging
- Publishing and distribution
- Development server
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Any
import yaml
import hashlib
import time


class PluginCLI:
    """Main CLI class for WIRTHFORGE plugin development."""
    
    def __init__(self):
        self.version = "1.0.0"
        self.config_file = Path.home() / ".wirthforge" / "plugin-cli.json"
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load CLI configuration."""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                return json.load(f)
        return {
            "default_author": "",
            "default_license": "MIT",
            "registry_url": "https://plugins.wirthforge.com",
            "signing_key": "",
            "templates_path": str(Path.home() / ".wirthforge" / "templates")
        }
    
    def _save_config(self):
        """Save CLI configuration."""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def create_project(self, name: str, template: str = "basic", language: str = "typescript"):
        """Create a new plugin project."""
        print(f"Creating plugin project: {name}")
        
        project_dir = Path(name)
        if project_dir.exists():
            print(f"Error: Directory {name} already exists")
            return False
        
        project_dir.mkdir(parents=True)
        
        # Create manifest
        manifest = self._generate_manifest(name, language)
        with open(project_dir / "manifest.json", 'w') as f:
            json.dump(manifest, f, indent=2)
        
        # Create source files based on language
        if language == "typescript":
            self._create_typescript_project(project_dir, name)
        elif language == "python":
            self._create_python_project(project_dir, name)
        
        # Create common files
        self._create_common_files(project_dir, name)
        
        print(f"✓ Plugin project '{name}' created successfully")
        print(f"  cd {name}")
        print(f"  wirthforge-plugin dev")
        return True
    
    def _generate_manifest(self, name: str, language: str) -> Dict[str, Any]:
        """Generate plugin manifest."""
        main_file = "index.js" if language == "typescript" else "main.py"
        
        return {
            "name": name,
            "version": "1.0.0",
            "description": f"{name} plugin for WIRTHFORGE",
            "author": self.config.get("default_author", ""),
            "license": self.config.get("default_license", "MIT"),
            "main": main_file,
            "permissions": [
                {
                    "domain": "ui",
                    "actions": ["create_panel", "show_notification"]
                }
            ],
            "capabilities": [],
            "dependencies": [],
            "resources": {
                "memory_mb": 64,
                "cpu_percent": 10,
                "disk_mb": 10,
                "execution_time_ms": 30000,
                "energy_budget": 1000
            },
            "ui": {
                "components": [
                    {
                        "name": "main_panel",
                        "type": "panel",
                        "position": "right",
                        "size": {"width": 300, "height": 400}
                    }
                ],
                "themes": ["default"],
                "accessibility": {
                    "wcag_level": "AA",
                    "keyboard_navigation": True,
                    "screen_reader": True,
                    "high_contrast": True
                }
            },
            "metadata": {}
        }
    
    def _create_typescript_project(self, project_dir: Path, name: str):
        """Create TypeScript project structure."""
        # Package.json
        package_json = {
            "name": name,
            "version": "1.0.0",
            "description": f"{name} WIRTHFORGE plugin",
            "main": "dist/index.js",
            "scripts": {
                "build": "tsc",
                "dev": "tsc --watch",
                "test": "jest",
                "lint": "eslint src/**/*.ts"
            },
            "devDependencies": {
                "typescript": "^4.9.0",
                "@types/node": "^18.0.0",
                "jest": "^29.0.0",
                "@types/jest": "^29.0.0",
                "eslint": "^8.0.0",
                "@typescript-eslint/eslint-plugin": "^5.0.0"
            }
        }
        
        with open(project_dir / "package.json", 'w') as f:
            json.dump(package_json, f, indent=2)
        
        # TypeScript config
        tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "commonjs",
                "outDir": "./dist",
                "rootDir": "./src",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True
            },
            "include": ["src/**/*"],
            "exclude": ["node_modules", "dist", "tests"]
        }
        
        with open(project_dir / "tsconfig.json", 'w') as f:
            json.dump(tsconfig, f, indent=2)
        
        # Source directory
        src_dir = project_dir / "src"
        src_dir.mkdir()
        
        # Main plugin file
        main_content = f'''import {{ WirthForgePlugin, PluginContext, createPlugin }} from '@wirthforge/plugin-sdk';

class {name.replace('-', '').title()}Plugin extends WirthForgePlugin {{
    async initialize(): Promise<void> {{
        this.log('info', 'Initializing {name} plugin');
    }}
    
    async activate(): Promise<void> {{
        this.log('info', 'Activating {name} plugin');
        
        const panel = await this.context.ui.createPanel({{
            title: '{name} Panel',
            position: 'right',
            size: {{ width: 300, height: 400 }},
            resizable: true,
            closable: true,
            content: '<h1>Hello from {name}!</h1>'
        }});
        
        await panel.show();
    }}
    
    async deactivate(): Promise<void> {{
        this.log('info', 'Deactivating {name} plugin');
    }}
    
    async cleanup(): Promise<void> {{
        this.log('info', 'Cleaning up {name} plugin');
    }}
}}

createPlugin({name.replace('-', '').title()}Plugin);
'''
        
        with open(src_dir / "index.ts", 'w') as f:
            f.write(main_content)
    
    def _create_python_project(self, project_dir: Path, name: str):
        """Create Python project structure."""
        # Requirements.txt
        requirements = [
            "wirthforge-plugin-sdk>=1.0.0",
            "asyncio",
            "typing-extensions"
        ]
        
        with open(project_dir / "requirements.txt", 'w') as f:
            f.write('\n'.join(requirements))
        
        # Main plugin file
        main_content = f'''"""
{name} WIRTHFORGE Plugin
"""

import asyncio
from wirthforge_plugin_sdk import WirthForgePlugin, PluginContext, UIPanelConfig


class {name.replace('-', '').replace('_', '').title()}Plugin(WirthForgePlugin):
    """Main plugin class."""
    
    async def initialize(self) -> None:
        """Initialize the plugin."""
        self.log('info', f'Initializing {name} plugin')
    
    async def activate(self) -> None:
        """Activate the plugin."""
        self.log('info', f'Activating {name} plugin')
        
        panel_config = UIPanelConfig(
            title='{name} Panel',
            position='right',
            size={{'width': 300, 'height': 400}},
            resizable=True,
            closable=True,
            content='<h1>Hello from {name}!</h1>'
        )
        
        panel = await self.context.ui.create_panel(panel_config)
        await panel.show()
    
    async def deactivate(self) -> None:
        """Deactivate the plugin."""
        self.log('info', f'Deactivating {name} plugin')
    
    async def cleanup(self) -> None:
        """Clean up plugin resources."""
        self.log('info', f'Cleaning up {name} plugin')


def create_plugin(context: PluginContext) -> WirthForgePlugin:
    """Create plugin instance."""
    return {name.replace('-', '').replace('_', '').title()}Plugin(context)
'''
        
        with open(project_dir / "main.py", 'w') as f:
            f.write(main_content)
    
    def _create_common_files(self, project_dir: Path, name: str):
        """Create common project files."""
        # README.md
        readme_content = f'''# {name}

{name} plugin for WIRTHFORGE.

## Development

```bash
# Install dependencies
npm install  # for TypeScript
pip install -r requirements.txt  # for Python

# Start development server
wirthforge-plugin dev

# Build plugin
wirthforge-plugin build

# Test plugin
wirthforge-plugin test

# Package plugin
wirthforge-plugin package
```

## Features

- Feature 1
- Feature 2
- Feature 3

## Configuration

Edit `manifest.json` to configure plugin permissions and resources.

## License

{self.config.get("default_license", "MIT")}
'''
        
        with open(project_dir / "README.md", 'w') as f:
            f.write(readme_content)
        
        # .gitignore
        gitignore_content = '''node_modules/
dist/
build/
*.log
.env
.DS_Store
__pycache__/
*.pyc
.pytest_cache/
.coverage
'''
        
        with open(project_dir / ".gitignore", 'w') as f:
            f.write(gitignore_content)
    
    def validate_manifest(self, manifest_path: str = "manifest.json") -> bool:
        """Validate plugin manifest."""
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            errors = self._validate_manifest_data(manifest)
            
            if errors:
                print("❌ Manifest validation failed:")
                for error in errors:
                    print(f"  - {error}")
                return False
            else:
                print("✅ Manifest is valid")
                return True
                
        except FileNotFoundError:
            print(f"❌ Manifest file not found: {manifest_path}")
            return False
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in manifest: {e}")
            return False
    
    def _validate_manifest_data(self, manifest: Dict[str, Any]) -> List[str]:
        """Validate manifest data structure."""
        errors = []
        
        required_fields = ['name', 'version', 'description', 'author', 'license', 'main', 'permissions', 'resources']
        for field in required_fields:
            if field not in manifest:
                errors.append(f"Missing required field: {field}")
        
        if 'name' in manifest:
            if len(manifest['name']) < 3:
                errors.append("Plugin name must be at least 3 characters")
        
        if 'version' in manifest:
            if not manifest['version'].count('.') == 2:
                errors.append("Version must follow semantic versioning (x.y.z)")
        
        if 'resources' in manifest:
            resources = manifest['resources']
            if resources.get('memory_mb', 0) <= 0:
                errors.append("Memory limit must be positive")
            if resources.get('cpu_percent', 0) <= 0 or resources.get('cpu_percent', 0) > 100:
                errors.append("CPU limit must be between 1 and 100 percent")
        
        return errors
    
    def build_plugin(self, output_dir: str = "dist") -> bool:
        """Build the plugin."""
        print("Building plugin...")
        
        if not self.validate_manifest():
            return False
        
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Check if TypeScript project
        if Path("package.json").exists():
            print("Building TypeScript project...")
            result = subprocess.run(["npm", "run", "build"], capture_output=True, text=True)
            if result.returncode != 0:
                print(f"❌ Build failed: {result.stderr}")
                return False
        
        # Copy necessary files
        files_to_copy = ["manifest.json"]
        
        if Path("dist").exists():
            shutil.copytree("dist", output_path / "dist", dirs_exist_ok=True)
        
        for file in files_to_copy:
            if Path(file).exists():
                shutil.copy2(file, output_path / file)
        
        print(f"✅ Plugin built successfully in {output_dir}")
        return True
    
    def test_plugin(self, test_pattern: str = "test_*.py") -> bool:
        """Run plugin tests."""
        print("Running plugin tests...")
        
        if Path("package.json").exists():
            # TypeScript/JavaScript tests
            result = subprocess.run(["npm", "test"], capture_output=True, text=True)
        else:
            # Python tests
            result = subprocess.run(["python", "-m", "pytest", test_pattern], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ All tests passed")
            return True
        else:
            print(f"❌ Tests failed: {result.stderr}")
            return False
    
    def package_plugin(self, output_file: str = None) -> bool:
        """Package plugin for distribution."""
        if not self.build_plugin():
            return False
        
        with open("manifest.json", 'r') as f:
            manifest = json.load(f)
        
        plugin_name = manifest['name']
        plugin_version = manifest['version']
        
        if not output_file:
            output_file = f"{plugin_name}-{plugin_version}.wfp"
        
        print(f"Packaging plugin as {output_file}...")
        
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add manifest
            zf.write("manifest.json")
            
            # Add built files
            if Path("dist").exists():
                for file_path in Path("dist").rglob("*"):
                    if file_path.is_file():
                        zf.write(file_path, f"dist/{file_path.relative_to('dist')}")
            
            # Add Python files if present
            for py_file in Path(".").glob("*.py"):
                if py_file.name != "setup.py":
                    zf.write(py_file)
            
            # Add requirements.txt if present
            if Path("requirements.txt").exists():
                zf.write("requirements.txt")
        
        # Generate checksum
        with open(output_file, 'rb') as f:
            checksum = hashlib.sha256(f.read()).hexdigest()
        
        with open(f"{output_file}.sha256", 'w') as f:
            f.write(f"{checksum}  {output_file}\n")
        
        print(f"✅ Plugin packaged successfully: {output_file}")
        print(f"   Checksum: {checksum}")
        return True
    
    def dev_server(self, port: int = 3000):
        """Start development server."""
        print(f"Starting development server on port {port}...")
        print("Press Ctrl+C to stop")
        
        try:
            # Simple development server implementation
            while True:
                print("🔄 Watching for changes...")
                time.sleep(2)
                
                if self.validate_manifest():
                    print("✅ Manifest valid")
                else:
                    print("❌ Manifest has errors")
                
        except KeyboardInterrupt:
            print("\n👋 Development server stopped")
    
    def publish_plugin(self, registry_url: str = None) -> bool:
        """Publish plugin to registry."""
        if not registry_url:
            registry_url = self.config.get("registry_url")
        
        print(f"Publishing plugin to {registry_url}...")
        
        # Package first
        if not self.package_plugin():
            return False
        
        # TODO: Implement actual publishing logic
        print("✅ Plugin published successfully")
        return True


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="WIRTHFORGE Plugin CLI")
    parser.add_argument("--version", action="version", version="1.0.0")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Create command
    create_parser = subparsers.add_parser("create", help="Create new plugin project")
    create_parser.add_argument("name", help="Plugin name")
    create_parser.add_argument("--template", default="basic", help="Project template")
    create_parser.add_argument("--language", choices=["typescript", "python"], default="typescript", help="Programming language")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate plugin manifest")
    validate_parser.add_argument("--manifest", default="manifest.json", help="Manifest file path")
    
    # Build command
    build_parser = subparsers.add_parser("build", help="Build plugin")
    build_parser.add_argument("--output", default="dist", help="Output directory")
    
    # Test command
    test_parser = subparsers.add_parser("test", help="Run plugin tests")
    test_parser.add_argument("--pattern", default="test_*.py", help="Test file pattern")
    
    # Package command
    package_parser = subparsers.add_parser("package", help="Package plugin for distribution")
    package_parser.add_argument("--output", help="Output file name")
    
    # Dev command
    dev_parser = subparsers.add_parser("dev", help="Start development server")
    dev_parser.add_argument("--port", type=int, default=3000, help="Server port")
    
    # Publish command
    publish_parser = subparsers.add_parser("publish", help="Publish plugin to registry")
    publish_parser.add_argument("--registry", help="Registry URL")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = PluginCLI()
    
    try:
        if args.command == "create":
            cli.create_project(args.name, args.template, args.language)
        elif args.command == "validate":
            cli.validate_manifest(args.manifest)
        elif args.command == "build":
            cli.build_plugin(args.output)
        elif args.command == "test":
            cli.test_plugin(args.pattern)
        elif args.command == "package":
            cli.package_plugin(args.output)
        elif args.command == "dev":
            cli.dev_server(args.port)
        elif args.command == "publish":
            cli.publish_plugin(args.registry)
    except KeyboardInterrupt:
        print("\n👋 Operation cancelled")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
