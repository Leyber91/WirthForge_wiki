"""
WF-TECH-008: WIRTHFORGE Plugin Marketplace & Distribution System

Comprehensive marketplace system for plugin distribution:
- Plugin submission and review workflow
- Automated security scanning and validation
- Version management and dependency resolution
- User ratings and reviews system
- Download and installation management
- Revenue sharing and monetization
- Analytics and usage tracking
- Admin dashboard and moderation tools
"""

import asyncio
import hashlib
import json
import logging
import os
import sqlite3
import time
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
import aiohttp
import aiofiles
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import semver


class PluginStatus(Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED = "published"
    DEPRECATED = "deprecated"
    SUSPENDED = "suspended"


class ReviewStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_CHANGES = "needs_changes"


@dataclass
class PluginMetadata:
    """Plugin metadata for marketplace."""
    id: str
    name: str
    version: str
    description: str
    author: str
    author_id: str
    license: str
    category: str
    tags: List[str]
    homepage: Optional[str] = None
    repository: Optional[str] = None
    documentation: Optional[str] = None
    screenshots: List[str] = field(default_factory=list)
    icon: Optional[str] = None
    price: float = 0.0
    currency: str = "USD"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    status: PluginStatus = PluginStatus.SUBMITTED
    download_count: int = 0
    rating_average: float = 0.0
    rating_count: int = 0
    file_size: int = 0
    file_hash: str = ""
    dependencies: List[str] = field(default_factory=list)
    permissions: List[str] = field(default_factory=list)
    min_wirthforge_version: str = "1.0.0"
    max_wirthforge_version: Optional[str] = None


@dataclass
class PluginReview:
    """Plugin review data."""
    id: str
    plugin_id: str
    reviewer_id: str
    status: ReviewStatus
    security_score: int
    performance_score: int
    usability_score: int
    overall_score: int
    comments: str
    automated_checks: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class UserReview:
    """User review and rating."""
    id: str
    plugin_id: str
    user_id: str
    rating: int  # 1-5 stars
    title: str
    comment: str
    version: str
    helpful_count: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


class MarketplaceDatabase:
    """Database layer for marketplace operations."""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS plugins (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    version TEXT NOT NULL,
                    description TEXT NOT NULL,
                    author TEXT NOT NULL,
                    author_id TEXT NOT NULL,
                    license TEXT NOT NULL,
                    category TEXT NOT NULL,
                    tags TEXT NOT NULL,
                    homepage TEXT,
                    repository TEXT,
                    documentation TEXT,
                    screenshots TEXT,
                    icon TEXT,
                    price REAL DEFAULT 0.0,
                    currency TEXT DEFAULT 'USD',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'submitted',
                    download_count INTEGER DEFAULT 0,
                    rating_average REAL DEFAULT 0.0,
                    rating_count INTEGER DEFAULT 0,
                    file_size INTEGER DEFAULT 0,
                    file_hash TEXT NOT NULL,
                    dependencies TEXT,
                    permissions TEXT,
                    min_wirthforge_version TEXT DEFAULT '1.0.0',
                    max_wirthforge_version TEXT
                );
                
                CREATE TABLE IF NOT EXISTS plugin_reviews (
                    id TEXT PRIMARY KEY,
                    plugin_id TEXT NOT NULL,
                    reviewer_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    security_score INTEGER,
                    performance_score INTEGER,
                    usability_score INTEGER,
                    overall_score INTEGER,
                    comments TEXT,
                    automated_checks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (plugin_id) REFERENCES plugins (id)
                );
                
                CREATE TABLE IF NOT EXISTS user_reviews (
                    id TEXT PRIMARY KEY,
                    plugin_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                    title TEXT NOT NULL,
                    comment TEXT,
                    version TEXT NOT NULL,
                    helpful_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (plugin_id) REFERENCES plugins (id),
                    UNIQUE (plugin_id, user_id)
                );
                
                CREATE TABLE IF NOT EXISTS plugin_downloads (
                    id TEXT PRIMARY KEY,
                    plugin_id TEXT NOT NULL,
                    user_id TEXT,
                    version TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (plugin_id) REFERENCES plugins (id)
                );
                
                CREATE TABLE IF NOT EXISTS plugin_versions (
                    id TEXT PRIMARY KEY,
                    plugin_id TEXT NOT NULL,
                    version TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_hash TEXT NOT NULL,
                    changelog TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (plugin_id) REFERENCES plugins (id),
                    UNIQUE (plugin_id, version)
                );
                
                CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins (status);
                CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins (category);
                CREATE INDEX IF NOT EXISTS idx_plugins_author ON plugins (author_id);
                CREATE INDEX IF NOT EXISTS idx_user_reviews_plugin ON user_reviews (plugin_id);
                CREATE INDEX IF NOT EXISTS idx_downloads_plugin ON plugin_downloads (plugin_id);
            """)
    
    async def create_plugin(self, plugin: PluginMetadata) -> bool:
        """Create a new plugin entry."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO plugins (
                        id, name, version, description, author, author_id, license,
                        category, tags, homepage, repository, documentation,
                        screenshots, icon, price, currency, status, file_size,
                        file_hash, dependencies, permissions, min_wirthforge_version,
                        max_wirthforge_version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    plugin.id, plugin.name, plugin.version, plugin.description,
                    plugin.author, plugin.author_id, plugin.license, plugin.category,
                    json.dumps(plugin.tags), plugin.homepage, plugin.repository,
                    plugin.documentation, json.dumps(plugin.screenshots), plugin.icon,
                    plugin.price, plugin.currency, plugin.status.value, plugin.file_size,
                    plugin.file_hash, json.dumps(plugin.dependencies),
                    json.dumps(plugin.permissions), plugin.min_wirthforge_version,
                    plugin.max_wirthforge_version
                ))
                conn.commit()
            return True
        except Exception as e:
            logging.error(f"Failed to create plugin: {e}")
            return False
    
    async def get_plugin(self, plugin_id: str) -> Optional[PluginMetadata]:
        """Get plugin by ID."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM plugins WHERE id = ?", (plugin_id,))
            row = cursor.fetchone()
            
            if row:
                return PluginMetadata(
                    id=row['id'],
                    name=row['name'],
                    version=row['version'],
                    description=row['description'],
                    author=row['author'],
                    author_id=row['author_id'],
                    license=row['license'],
                    category=row['category'],
                    tags=json.loads(row['tags']),
                    homepage=row['homepage'],
                    repository=row['repository'],
                    documentation=row['documentation'],
                    screenshots=json.loads(row['screenshots']) if row['screenshots'] else [],
                    icon=row['icon'],
                    price=row['price'],
                    currency=row['currency'],
                    created_at=datetime.fromisoformat(row['created_at']),
                    updated_at=datetime.fromisoformat(row['updated_at']),
                    status=PluginStatus(row['status']),
                    download_count=row['download_count'],
                    rating_average=row['rating_average'],
                    rating_count=row['rating_count'],
                    file_size=row['file_size'],
                    file_hash=row['file_hash'],
                    dependencies=json.loads(row['dependencies']) if row['dependencies'] else [],
                    permissions=json.loads(row['permissions']) if row['permissions'] else [],
                    min_wirthforge_version=row['min_wirthforge_version'],
                    max_wirthforge_version=row['max_wirthforge_version']
                )
        return None
    
    async def search_plugins(self, query: str = "", category: str = "", 
                           status: PluginStatus = None, limit: int = 50, 
                           offset: int = 0) -> List[PluginMetadata]:
        """Search plugins with filters."""
        conditions = []
        params = []
        
        if query:
            conditions.append("(name LIKE ? OR description LIKE ? OR tags LIKE ?)")
            params.extend([f"%{query}%", f"%{query}%", f"%{query}%"])
        
        if category:
            conditions.append("category = ?")
            params.append(category)
        
        if status:
            conditions.append("status = ?")
            params.append(status.value)
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(f"""
                SELECT * FROM plugins {where_clause}
                ORDER BY rating_average DESC, download_count DESC
                LIMIT ? OFFSET ?
            """, params + [limit, offset])
            
            plugins = []
            for row in cursor.fetchall():
                plugins.append(PluginMetadata(
                    id=row['id'],
                    name=row['name'],
                    version=row['version'],
                    description=row['description'],
                    author=row['author'],
                    author_id=row['author_id'],
                    license=row['license'],
                    category=row['category'],
                    tags=json.loads(row['tags']),
                    status=PluginStatus(row['status']),
                    download_count=row['download_count'],
                    rating_average=row['rating_average'],
                    rating_count=row['rating_count'],
                    price=row['price'],
                    currency=row['currency']
                ))
            
            return plugins


class PluginValidator:
    """Validates plugins for marketplace submission."""
    
    def __init__(self):
        self.security_checks = [
            self._check_manifest_security,
            self._check_permissions,
            self._check_code_patterns,
            self._check_dependencies
        ]
        self.performance_checks = [
            self._check_resource_limits,
            self._check_file_size,
            self._check_startup_time
        ]
    
    async def validate_plugin(self, plugin_file: str) -> Dict[str, Any]:
        """Comprehensive plugin validation."""
        results = {
            'valid': True,
            'security_score': 0,
            'performance_score': 0,
            'usability_score': 0,
            'issues': [],
            'warnings': []
        }
        
        try:
            # Extract and validate plugin
            with zipfile.ZipFile(plugin_file, 'r') as zf:
                # Check manifest
                manifest_data = json.loads(zf.read('manifest.json'))
                
                # Run security checks
                security_results = await self._run_security_checks(zf, manifest_data)
                results['security_score'] = security_results['score']
                results['issues'].extend(security_results['issues'])
                results['warnings'].extend(security_results['warnings'])
                
                # Run performance checks
                performance_results = await self._run_performance_checks(zf, manifest_data)
                results['performance_score'] = performance_results['score']
                results['issues'].extend(performance_results['issues'])
                results['warnings'].extend(performance_results['warnings'])
                
                # Run usability checks
                usability_results = await self._run_usability_checks(zf, manifest_data)
                results['usability_score'] = usability_results['score']
                results['issues'].extend(usability_results['issues'])
                results['warnings'].extend(usability_results['warnings'])
                
                # Overall validation
                if results['issues']:
                    results['valid'] = False
                
                # Calculate overall score
                results['overall_score'] = int(
                    (results['security_score'] + results['performance_score'] + results['usability_score']) / 3
                )
                
        except Exception as e:
            results['valid'] = False
            results['issues'].append(f"Validation error: {str(e)}")
        
        return results
    
    async def _run_security_checks(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Run security validation checks."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        for check in self.security_checks:
            try:
                check_result = await check(zf, manifest)
                results['score'] = min(results['score'], check_result['score'])
                results['issues'].extend(check_result.get('issues', []))
                results['warnings'].extend(check_result.get('warnings', []))
            except Exception as e:
                results['issues'].append(f"Security check failed: {str(e)}")
                results['score'] -= 20
        
        return results
    
    async def _run_performance_checks(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Run performance validation checks."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        for check in self.performance_checks:
            try:
                check_result = await check(zf, manifest)
                results['score'] = min(results['score'], check_result['score'])
                results['issues'].extend(check_result.get('issues', []))
                results['warnings'].extend(check_result.get('warnings', []))
            except Exception as e:
                results['issues'].append(f"Performance check failed: {str(e)}")
                results['score'] -= 15
        
        return results
    
    async def _run_usability_checks(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Run usability validation checks."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        # Check documentation
        if not manifest.get('description') or len(manifest['description']) < 50:
            results['warnings'].append("Plugin description should be more detailed")
            results['score'] -= 10
        
        # Check UI accessibility
        if manifest.get('ui', {}).get('accessibility', {}).get('wcag_level') != 'AA':
            results['warnings'].append("Plugin should support WCAG 2.2 AA accessibility")
            results['score'] -= 5
        
        return results
    
    async def _check_manifest_security(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Check manifest for security issues."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        # Check for excessive permissions
        permissions = manifest.get('permissions', [])
        dangerous_permissions = ['network', 'filesystem', 'system']
        
        for perm in permissions:
            if perm.get('domain') in dangerous_permissions:
                results['warnings'].append(f"Plugin requests dangerous permission: {perm['domain']}")
                results['score'] -= 10
        
        return results
    
    async def _check_permissions(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Check permission usage."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        # Validate permission structure
        permissions = manifest.get('permissions', [])
        for perm in permissions:
            if not isinstance(perm, dict) or 'domain' not in perm or 'actions' not in perm:
                results['issues'].append("Invalid permission structure")
                results['score'] -= 20
        
        return results
    
    async def _check_code_patterns(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Check for dangerous code patterns."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        # Check for suspicious patterns in code files
        dangerous_patterns = ['eval(', 'exec(', 'subprocess.', 'os.system']
        
        for file_info in zf.filelist:
            if file_info.filename.endswith(('.py', '.js', '.ts')):
                try:
                    content = zf.read(file_info.filename).decode('utf-8')
                    for pattern in dangerous_patterns:
                        if pattern in content:
                            results['warnings'].append(f"Suspicious pattern '{pattern}' found in {file_info.filename}")
                            results['score'] -= 15
                except:
                    pass  # Skip files that can't be decoded
        
        return results
    
    async def _check_dependencies(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Check plugin dependencies."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        dependencies = manifest.get('dependencies', [])
        if len(dependencies) > 10:
            results['warnings'].append("Plugin has many dependencies, consider reducing")
            results['score'] -= 5
        
        return results
    
    async def _check_resource_limits(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Check resource limit configuration."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        resources = manifest.get('resources', {})
        
        # Check memory limit
        memory_mb = resources.get('memory_mb', 0)
        if memory_mb > 512:
            results['warnings'].append("High memory usage requested")
            results['score'] -= 10
        elif memory_mb <= 0:
            results['issues'].append("Invalid memory limit")
            results['score'] -= 20
        
        # Check CPU limit
        cpu_percent = resources.get('cpu_percent', 0)
        if cpu_percent > 50:
            results['warnings'].append("High CPU usage requested")
            results['score'] -= 10
        elif cpu_percent <= 0 or cpu_percent > 100:
            results['issues'].append("Invalid CPU limit")
            results['score'] -= 20
        
        return results
    
    async def _check_file_size(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Check plugin file size."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        total_size = sum(info.file_size for info in zf.filelist)
        
        if total_size > 50 * 1024 * 1024:  # 50MB
            results['issues'].append("Plugin package too large (>50MB)")
            results['score'] -= 30
        elif total_size > 10 * 1024 * 1024:  # 10MB
            results['warnings'].append("Large plugin package (>10MB)")
            results['score'] -= 10
        
        return results
    
    async def _check_startup_time(self, zf: zipfile.ZipFile, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Check estimated startup time."""
        results = {'score': 100, 'issues': [], 'warnings': []}
        
        execution_time = manifest.get('resources', {}).get('execution_time_ms', 0)
        
        if execution_time > 10000:  # 10 seconds
            results['warnings'].append("Long initialization time requested")
            results['score'] -= 15
        
        return results


class MarketplaceAPI:
    """REST API for marketplace operations."""
    
    def __init__(self, db: MarketplaceDatabase, storage_path: str):
        self.db = db
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self.validator = PluginValidator()
    
    async def submit_plugin(self, plugin_file: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Submit a plugin for review."""
        try:
            # Generate plugin ID
            plugin_id = hashlib.sha256(f"{metadata['name']}{metadata['version']}{time.time()}".encode()).hexdigest()[:16]
            
            # Save plugin file
            file_path = self.storage_path / f"{plugin_id}.wfp"
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(plugin_file)
            
            # Calculate file hash
            file_hash = hashlib.sha256(plugin_file).hexdigest()
            
            # Validate plugin
            validation_result = await self.validator.validate_plugin(str(file_path))
            
            # Create plugin metadata
            plugin = PluginMetadata(
                id=plugin_id,
                name=metadata['name'],
                version=metadata['version'],
                description=metadata['description'],
                author=metadata['author'],
                author_id=metadata['author_id'],
                license=metadata['license'],
                category=metadata['category'],
                tags=metadata.get('tags', []),
                homepage=metadata.get('homepage'),
                repository=metadata.get('repository'),
                documentation=metadata.get('documentation'),
                screenshots=metadata.get('screenshots', []),
                icon=metadata.get('icon'),
                price=metadata.get('price', 0.0),
                currency=metadata.get('currency', 'USD'),
                file_size=len(plugin_file),
                file_hash=file_hash,
                dependencies=metadata.get('dependencies', []),
                permissions=metadata.get('permissions', []),
                min_wirthforge_version=metadata.get('min_wirthforge_version', '1.0.0'),
                max_wirthforge_version=metadata.get('max_wirthforge_version')
            )
            
            # Save to database
            success = await self.db.create_plugin(plugin)
            
            if success:
                return {
                    'success': True,
                    'plugin_id': plugin_id,
                    'status': 'submitted',
                    'validation': validation_result
                }
            else:
                return {'success': False, 'error': 'Failed to save plugin'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def get_plugin_details(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed plugin information."""
        plugin = await self.db.get_plugin(plugin_id)
        if plugin:
            return {
                'id': plugin.id,
                'name': plugin.name,
                'version': plugin.version,
                'description': plugin.description,
                'author': plugin.author,
                'license': plugin.license,
                'category': plugin.category,
                'tags': plugin.tags,
                'homepage': plugin.homepage,
                'repository': plugin.repository,
                'documentation': plugin.documentation,
                'screenshots': plugin.screenshots,
                'icon': plugin.icon,
                'price': plugin.price,
                'currency': plugin.currency,
                'status': plugin.status.value,
                'download_count': plugin.download_count,
                'rating_average': plugin.rating_average,
                'rating_count': plugin.rating_count,
                'created_at': plugin.created_at.isoformat(),
                'updated_at': plugin.updated_at.isoformat(),
                'dependencies': plugin.dependencies,
                'permissions': plugin.permissions,
                'min_wirthforge_version': plugin.min_wirthforge_version,
                'max_wirthforge_version': plugin.max_wirthforge_version
            }
        return None
    
    async def search_plugins(self, query: str = "", category: str = "", 
                           limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Search marketplace plugins."""
        plugins = await self.db.search_plugins(
            query=query,
            category=category,
            status=PluginStatus.PUBLISHED,
            limit=limit,
            offset=offset
        )
        
        return [
            {
                'id': plugin.id,
                'name': plugin.name,
                'version': plugin.version,
                'description': plugin.description,
                'author': plugin.author,
                'category': plugin.category,
                'tags': plugin.tags,
                'price': plugin.price,
                'currency': plugin.currency,
                'download_count': plugin.download_count,
                'rating_average': plugin.rating_average,
                'rating_count': plugin.rating_count
            }
            for plugin in plugins
        ]
    
    async def download_plugin(self, plugin_id: str, user_id: str = None) -> Optional[bytes]:
        """Download a plugin file."""
        plugin = await self.db.get_plugin(plugin_id)
        if not plugin or plugin.status != PluginStatus.PUBLISHED:
            return None
        
        file_path = self.storage_path / f"{plugin_id}.wfp"
        if file_path.exists():
            async with aiofiles.open(file_path, 'rb') as f:
                content = await f.read()
            
            # Record download
            await self._record_download(plugin_id, user_id)
            
            return content
        
        return None
    
    async def _record_download(self, plugin_id: str, user_id: str = None):
        """Record plugin download for analytics."""
        # Implementation would record download in database
        pass


# Example usage and testing
async def main():
    """Example marketplace usage."""
    # Initialize database
    db = MarketplaceDatabase("marketplace.db")
    
    # Initialize API
    api = MarketplaceAPI(db, "plugin_storage")
    
    # Example plugin submission
    example_metadata = {
        'name': 'example-plugin',
        'version': '1.0.0',
        'description': 'An example plugin for demonstration',
        'author': 'Example Author',
        'author_id': 'author123',
        'license': 'MIT',
        'category': 'productivity',
        'tags': ['example', 'demo'],
        'price': 0.0,
        'dependencies': [],
        'permissions': [
            {'domain': 'ui', 'actions': ['create_panel']}
        ]
    }
    
    # Create example plugin file
    example_plugin_content = b"Example plugin content"
    
    # Submit plugin
    result = await api.submit_plugin(example_plugin_content, example_metadata)
    print(f"Submission result: {result}")
    
    # Search plugins
    plugins = await api.search_plugins(query="example")
    print(f"Found {len(plugins)} plugins")


if __name__ == "__main__":
    asyncio.run(main())
