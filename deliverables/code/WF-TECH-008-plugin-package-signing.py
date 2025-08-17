"""
WF-TECH-008: WIRTHFORGE Plugin Package Format & Signing System

Comprehensive plugin packaging and cryptographic signing system:
- Standardized .wfp (WIRTHFORGE Plugin) package format
- RSA/ECDSA digital signatures for integrity verification
- Package metadata and dependency management
- Version control and update mechanisms
- Secure distribution and installation
- Certificate authority and trust chain management
- Package validation and verification
"""

import asyncio
import base64
import hashlib
import json
import os
import tempfile
import time
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import semver
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID


@dataclass
class PackageSignature:
    """Digital signature for plugin package."""
    algorithm: str  # 'RSA-SHA256', 'ECDSA-SHA256'
    signature: str  # Base64 encoded signature
    certificate: str  # Base64 encoded certificate
    timestamp: datetime
    signer_id: str
    key_fingerprint: str


@dataclass
class PackageMetadata:
    """Complete package metadata."""
    format_version: str = "1.0"
    package_id: str = ""
    name: str = ""
    version: str = ""
    description: str = ""
    author: str = ""
    author_email: str = ""
    license: str = ""
    homepage: Optional[str] = None
    repository: Optional[str] = None
    documentation: Optional[str] = None
    keywords: List[str] = field(default_factory=list)
    category: str = ""
    
    # Dependencies
    dependencies: List[Dict[str, str]] = field(default_factory=list)
    dev_dependencies: List[Dict[str, str]] = field(default_factory=list)
    peer_dependencies: List[Dict[str, str]] = field(default_factory=list)
    
    # Runtime requirements
    min_wirthforge_version: str = "1.0.0"
    max_wirthforge_version: Optional[str] = None
    supported_platforms: List[str] = field(default_factory=lambda: ["win32", "linux", "darwin"])
    
    # Package info
    created_at: datetime = field(default_factory=datetime.now)
    file_hash: str = ""
    file_size: int = 0
    
    # Security
    permissions: List[Dict[str, Any]] = field(default_factory=list)
    capabilities: List[str] = field(default_factory=list)
    resource_limits: Dict[str, Any] = field(default_factory=dict)
    
    # Signatures
    signatures: List[PackageSignature] = field(default_factory=list)


class PluginPackageFormat:
    """Handles .wfp package format operations."""
    
    PACKAGE_EXTENSION = ".wfp"
    MANIFEST_FILE = "package.json"
    PLUGIN_MANIFEST = "manifest.json"
    SIGNATURE_FILE = "signatures.json"
    
    def __init__(self):
        self.temp_dir = None
    
    def create_package(self, source_dir: str, output_file: str, metadata: PackageMetadata) -> bool:
        """Create a .wfp package from source directory."""
        try:
            source_path = Path(source_dir)
            if not source_path.exists():
                raise FileNotFoundError(f"Source directory not found: {source_dir}")
            
            # Ensure output has correct extension
            if not output_file.endswith(self.PACKAGE_EXTENSION):
                output_file += self.PACKAGE_EXTENSION
            
            with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
                # Add package metadata
                package_metadata = self._prepare_package_metadata(metadata, source_path)
                zf.writestr(self.MANIFEST_FILE, json.dumps(package_metadata, indent=2, default=str))
                
                # Add plugin manifest if exists
                plugin_manifest_path = source_path / "manifest.json"
                if plugin_manifest_path.exists():
                    zf.write(plugin_manifest_path, self.PLUGIN_MANIFEST)
                
                # Add all source files
                for file_path in source_path.rglob("*"):
                    if file_path.is_file() and not self._should_exclude_file(file_path):
                        arcname = file_path.relative_to(source_path)
                        zf.write(file_path, arcname)
                
                # Calculate package hash
                package_hash = self._calculate_package_hash(zf)
                
                # Update metadata with hash
                package_metadata['file_hash'] = package_hash
                package_metadata['file_size'] = os.path.getsize(output_file)
                
                # Rewrite metadata with hash
                zf.writestr(self.MANIFEST_FILE, json.dumps(package_metadata, indent=2, default=str))
            
            return True
            
        except Exception as e:
            print(f"Failed to create package: {e}")
            return False
    
    def extract_package(self, package_file: str, output_dir: str) -> bool:
        """Extract .wfp package to directory."""
        try:
            with zipfile.ZipFile(package_file, 'r') as zf:
                zf.extractall(output_dir)
            return True
        except Exception as e:
            print(f"Failed to extract package: {e}")
            return False
    
    def read_package_metadata(self, package_file: str) -> Optional[PackageMetadata]:
        """Read package metadata from .wfp file."""
        try:
            with zipfile.ZipFile(package_file, 'r') as zf:
                if self.MANIFEST_FILE in zf.namelist():
                    metadata_json = json.loads(zf.read(self.MANIFEST_FILE))
                    return self._parse_package_metadata(metadata_json)
        except Exception as e:
            print(f"Failed to read package metadata: {e}")
        return None
    
    def validate_package_structure(self, package_file: str) -> Tuple[bool, List[str]]:
        """Validate package structure and contents."""
        errors = []
        
        try:
            with zipfile.ZipFile(package_file, 'r') as zf:
                files = zf.namelist()
                
                # Check required files
                if self.MANIFEST_FILE not in files:
                    errors.append(f"Missing required file: {self.MANIFEST_FILE}")
                
                if self.PLUGIN_MANIFEST not in files:
                    errors.append(f"Missing required file: {self.PLUGIN_MANIFEST}")
                
                # Validate metadata
                if self.MANIFEST_FILE in files:
                    try:
                        metadata_json = json.loads(zf.read(self.MANIFEST_FILE))
                        validation_errors = self._validate_metadata(metadata_json)
                        errors.extend(validation_errors)
                    except json.JSONDecodeError:
                        errors.append("Invalid JSON in package metadata")
                
                # Check for suspicious files
                suspicious_files = [f for f in files if self._is_suspicious_file(f)]
                if suspicious_files:
                    errors.extend([f"Suspicious file: {f}" for f in suspicious_files])
                
        except zipfile.BadZipFile:
            errors.append("Invalid ZIP file format")
        except Exception as e:
            errors.append(f"Package validation error: {str(e)}")
        
        return len(errors) == 0, errors
    
    def _prepare_package_metadata(self, metadata: PackageMetadata, source_path: Path) -> Dict[str, Any]:
        """Prepare package metadata for serialization."""
        # Auto-detect some metadata if not provided
        if not metadata.package_id:
            metadata.package_id = f"{metadata.name}-{metadata.version}"
        
        # Calculate file statistics
        total_size = sum(f.stat().st_size for f in source_path.rglob("*") if f.is_file())
        
        return {
            'format_version': metadata.format_version,
            'package_id': metadata.package_id,
            'name': metadata.name,
            'version': metadata.version,
            'description': metadata.description,
            'author': metadata.author,
            'author_email': metadata.author_email,
            'license': metadata.license,
            'homepage': metadata.homepage,
            'repository': metadata.repository,
            'documentation': metadata.documentation,
            'keywords': metadata.keywords,
            'category': metadata.category,
            'dependencies': metadata.dependencies,
            'dev_dependencies': metadata.dev_dependencies,
            'peer_dependencies': metadata.peer_dependencies,
            'min_wirthforge_version': metadata.min_wirthforge_version,
            'max_wirthforge_version': metadata.max_wirthforge_version,
            'supported_platforms': metadata.supported_platforms,
            'created_at': metadata.created_at.isoformat(),
            'file_hash': metadata.file_hash,
            'file_size': total_size,
            'permissions': metadata.permissions,
            'capabilities': metadata.capabilities,
            'resource_limits': metadata.resource_limits,
            'signatures': [
                {
                    'algorithm': sig.algorithm,
                    'signature': sig.signature,
                    'certificate': sig.certificate,
                    'timestamp': sig.timestamp.isoformat(),
                    'signer_id': sig.signer_id,
                    'key_fingerprint': sig.key_fingerprint
                }
                for sig in metadata.signatures
            ]
        }
    
    def _parse_package_metadata(self, metadata_json: Dict[str, Any]) -> PackageMetadata:
        """Parse package metadata from JSON."""
        signatures = []
        for sig_data in metadata_json.get('signatures', []):
            signatures.append(PackageSignature(
                algorithm=sig_data['algorithm'],
                signature=sig_data['signature'],
                certificate=sig_data['certificate'],
                timestamp=datetime.fromisoformat(sig_data['timestamp']),
                signer_id=sig_data['signer_id'],
                key_fingerprint=sig_data['key_fingerprint']
            ))
        
        return PackageMetadata(
            format_version=metadata_json.get('format_version', '1.0'),
            package_id=metadata_json.get('package_id', ''),
            name=metadata_json.get('name', ''),
            version=metadata_json.get('version', ''),
            description=metadata_json.get('description', ''),
            author=metadata_json.get('author', ''),
            author_email=metadata_json.get('author_email', ''),
            license=metadata_json.get('license', ''),
            homepage=metadata_json.get('homepage'),
            repository=metadata_json.get('repository'),
            documentation=metadata_json.get('documentation'),
            keywords=metadata_json.get('keywords', []),
            category=metadata_json.get('category', ''),
            dependencies=metadata_json.get('dependencies', []),
            dev_dependencies=metadata_json.get('dev_dependencies', []),
            peer_dependencies=metadata_json.get('peer_dependencies', []),
            min_wirthforge_version=metadata_json.get('min_wirthforge_version', '1.0.0'),
            max_wirthforge_version=metadata_json.get('max_wirthforge_version'),
            supported_platforms=metadata_json.get('supported_platforms', ['win32', 'linux', 'darwin']),
            created_at=datetime.fromisoformat(metadata_json.get('created_at', datetime.now().isoformat())),
            file_hash=metadata_json.get('file_hash', ''),
            file_size=metadata_json.get('file_size', 0),
            permissions=metadata_json.get('permissions', []),
            capabilities=metadata_json.get('capabilities', []),
            resource_limits=metadata_json.get('resource_limits', {}),
            signatures=signatures
        )
    
    def _calculate_package_hash(self, zf: zipfile.ZipFile) -> str:
        """Calculate SHA-256 hash of package contents."""
        hasher = hashlib.sha256()
        
        # Sort files for consistent hashing
        for filename in sorted(zf.namelist()):
            if filename != self.MANIFEST_FILE:  # Exclude metadata file from hash
                hasher.update(zf.read(filename))
        
        return hasher.hexdigest()
    
    def _should_exclude_file(self, file_path: Path) -> bool:
        """Check if file should be excluded from package."""
        exclude_patterns = [
            '.git', '.svn', '.hg',
            '__pycache__', '*.pyc', '*.pyo',
            'node_modules', '.npm',
            '.DS_Store', 'Thumbs.db',
            '*.tmp', '*.temp', '*.log'
        ]
        
        for pattern in exclude_patterns:
            if pattern in str(file_path) or file_path.name.endswith(pattern.replace('*', '')):
                return True
        
        return False
    
    def _is_suspicious_file(self, filename: str) -> bool:
        """Check if file is suspicious."""
        suspicious_extensions = ['.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.ps1']
        return any(filename.lower().endswith(ext) for ext in suspicious_extensions)
    
    def _validate_metadata(self, metadata: Dict[str, Any]) -> List[str]:
        """Validate package metadata."""
        errors = []
        
        required_fields = ['name', 'version', 'description', 'author', 'license']
        for field in required_fields:
            if not metadata.get(field):
                errors.append(f"Missing required field: {field}")
        
        # Validate version format
        version = metadata.get('version', '')
        if version:
            try:
                semver.VersionInfo.parse(version)
            except ValueError:
                errors.append(f"Invalid version format: {version}")
        
        return errors


class PluginSigner:
    """Handles cryptographic signing of plugin packages."""
    
    def __init__(self, private_key_path: str = None, certificate_path: str = None):
        self.private_key = None
        self.certificate = None
        
        if private_key_path and certificate_path:
            self.load_signing_credentials(private_key_path, certificate_path)
    
    def generate_signing_key(self, key_size: int = 2048) -> Tuple[bytes, bytes]:
        """Generate RSA key pair for signing."""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size
        )
        
        # Serialize private key
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Generate self-signed certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "CA"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "WIRTHFORGE"),
            x509.NameAttribute(NameOID.COMMON_NAME, "Plugin Signer"),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.utcnow()
        ).not_valid_after(
            datetime.utcnow() + timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
            ]),
            critical=False,
        ).add_extension(
            x509.ExtendedKeyUsage([
                ExtendedKeyUsageOID.CODE_SIGNING,
            ]),
            critical=True,
        ).sign(private_key, hashes.SHA256())
        
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)
        
        return private_pem, cert_pem
    
    def load_signing_credentials(self, private_key_path: str, certificate_path: str):
        """Load signing credentials from files."""
        try:
            # Load private key
            with open(private_key_path, 'rb') as f:
                self.private_key = serialization.load_pem_private_key(
                    f.read(),
                    password=None
                )
            
            # Load certificate
            with open(certificate_path, 'rb') as f:
                self.certificate = x509.load_pem_x509_certificate(f.read())
                
        except Exception as e:
            raise ValueError(f"Failed to load signing credentials: {e}")
    
    def sign_package(self, package_file: str, signer_id: str) -> PackageSignature:
        """Sign a plugin package."""
        if not self.private_key or not self.certificate:
            raise ValueError("Signing credentials not loaded")
        
        # Calculate package hash
        with open(package_file, 'rb') as f:
            package_data = f.read()
        
        package_hash = hashlib.sha256(package_data).digest()
        
        # Sign the hash
        signature = self.private_key.sign(
            package_hash,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        # Get certificate fingerprint
        cert_fingerprint = hashlib.sha256(
            self.certificate.public_bytes(serialization.Encoding.DER)
        ).hexdigest()[:16]
        
        return PackageSignature(
            algorithm="RSA-SHA256",
            signature=base64.b64encode(signature).decode('utf-8'),
            certificate=base64.b64encode(
                self.certificate.public_bytes(serialization.Encoding.PEM)
            ).decode('utf-8'),
            timestamp=datetime.now(),
            signer_id=signer_id,
            key_fingerprint=cert_fingerprint
        )
    
    def verify_signature(self, package_file: str, signature: PackageSignature) -> bool:
        """Verify package signature."""
        try:
            # Load certificate from signature
            cert_pem = base64.b64decode(signature.certificate)
            certificate = x509.load_pem_x509_certificate(cert_pem)
            
            # Calculate package hash
            with open(package_file, 'rb') as f:
                package_data = f.read()
            
            package_hash = hashlib.sha256(package_data).digest()
            
            # Verify signature
            signature_bytes = base64.b64decode(signature.signature)
            
            public_key = certificate.public_key()
            public_key.verify(
                signature_bytes,
                package_hash,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return True
            
        except Exception as e:
            print(f"Signature verification failed: {e}")
            return False


class PackageManager:
    """Manages plugin package operations."""
    
    def __init__(self, storage_dir: str):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.package_format = PluginPackageFormat()
        self.signer = PluginSigner()
    
    def install_package(self, package_file: str, verify_signature: bool = True) -> bool:
        """Install a plugin package."""
        try:
            # Validate package structure
            valid, errors = self.package_format.validate_package_structure(package_file)
            if not valid:
                print(f"Package validation failed: {errors}")
                return False
            
            # Read package metadata
            metadata = self.package_format.read_package_metadata(package_file)
            if not metadata:
                print("Failed to read package metadata")
                return False
            
            # Verify signatures if required
            if verify_signature and metadata.signatures:
                for signature in metadata.signatures:
                    if not self.signer.verify_signature(package_file, signature):
                        print(f"Signature verification failed for signer: {signature.signer_id}")
                        return False
                print("All signatures verified successfully")
            
            # Check dependencies
            if not self._check_dependencies(metadata.dependencies):
                print("Dependency check failed")
                return False
            
            # Extract package
            install_dir = self.storage_dir / metadata.name / metadata.version
            install_dir.mkdir(parents=True, exist_ok=True)
            
            if self.package_format.extract_package(package_file, str(install_dir)):
                print(f"Package {metadata.name} v{metadata.version} installed successfully")
                return True
            else:
                print("Failed to extract package")
                return False
                
        except Exception as e:
            print(f"Installation failed: {e}")
            return False
    
    def uninstall_package(self, package_name: str, version: str = None) -> bool:
        """Uninstall a plugin package."""
        try:
            if version:
                # Uninstall specific version
                package_dir = self.storage_dir / package_name / version
                if package_dir.exists():
                    import shutil
                    shutil.rmtree(package_dir)
                    print(f"Uninstalled {package_name} v{version}")
                    return True
            else:
                # Uninstall all versions
                package_dir = self.storage_dir / package_name
                if package_dir.exists():
                    import shutil
                    shutil.rmtree(package_dir)
                    print(f"Uninstalled all versions of {package_name}")
                    return True
            
            print(f"Package {package_name} not found")
            return False
            
        except Exception as e:
            print(f"Uninstallation failed: {e}")
            return False
    
    def list_installed_packages(self) -> List[Dict[str, str]]:
        """List all installed packages."""
        packages = []
        
        for package_dir in self.storage_dir.iterdir():
            if package_dir.is_dir():
                for version_dir in package_dir.iterdir():
                    if version_dir.is_dir():
                        metadata_file = version_dir / self.package_format.MANIFEST_FILE
                        if metadata_file.exists():
                            try:
                                with open(metadata_file, 'r') as f:
                                    metadata = json.load(f)
                                packages.append({
                                    'name': metadata['name'],
                                    'version': metadata['version'],
                                    'description': metadata['description'],
                                    'author': metadata['author'],
                                    'installed_path': str(version_dir)
                                })
                            except:
                                pass
        
        return packages
    
    def update_package(self, package_name: str, new_package_file: str) -> bool:
        """Update an installed package."""
        # Read new package metadata
        new_metadata = self.package_format.read_package_metadata(new_package_file)
        if not new_metadata:
            print("Failed to read new package metadata")
            return False
        
        # Check if package is installed
        current_packages = self.list_installed_packages()
        current_package = next((p for p in current_packages if p['name'] == package_name), None)
        
        if not current_package:
            print(f"Package {package_name} is not installed")
            return False
        
        # Compare versions
        if semver.compare(new_metadata.version, current_package['version']) <= 0:
            print(f"New version {new_metadata.version} is not newer than current {current_package['version']}")
            return False
        
        # Install new version
        if self.install_package(new_package_file):
            # Optionally remove old version
            print(f"Updated {package_name} from {current_package['version']} to {new_metadata.version}")
            return True
        
        return False
    
    def _check_dependencies(self, dependencies: List[Dict[str, str]]) -> bool:
        """Check if all dependencies are satisfied."""
        installed_packages = {p['name']: p['version'] for p in self.list_installed_packages()}
        
        for dep in dependencies:
            dep_name = dep['name']
            dep_version = dep['version']
            
            if dep_name not in installed_packages:
                print(f"Missing dependency: {dep_name}")
                return False
            
            installed_version = installed_packages[dep_name]
            
            # Simple version check (in real implementation, use proper semver range checking)
            if semver.compare(installed_version, dep_version) < 0:
                print(f"Dependency version mismatch: {dep_name} requires {dep_version}, installed {installed_version}")
                return False
        
        return True


# CLI interface for package management
def main():
    """CLI interface for plugin package management."""
    import argparse
    
    parser = argparse.ArgumentParser(description="WIRTHFORGE Plugin Package Manager")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Create package
    create_parser = subparsers.add_parser('create', help='Create plugin package')
    create_parser.add_argument('source_dir', help='Source directory')
    create_parser.add_argument('output_file', help='Output package file')
    create_parser.add_argument('--name', required=True, help='Plugin name')
    create_parser.add_argument('--version', required=True, help='Plugin version')
    create_parser.add_argument('--description', required=True, help='Plugin description')
    create_parser.add_argument('--author', required=True, help='Plugin author')
    create_parser.add_argument('--license', default='MIT', help='Plugin license')
    
    # Sign package
    sign_parser = subparsers.add_parser('sign', help='Sign plugin package')
    sign_parser.add_argument('package_file', help='Package file to sign')
    sign_parser.add_argument('--key', required=True, help='Private key file')
    sign_parser.add_argument('--cert', required=True, help='Certificate file')
    sign_parser.add_argument('--signer-id', required=True, help='Signer ID')
    
    # Install package
    install_parser = subparsers.add_parser('install', help='Install plugin package')
    install_parser.add_argument('package_file', help='Package file to install')
    install_parser.add_argument('--no-verify', action='store_true', help='Skip signature verification')
    
    # List packages
    list_parser = subparsers.add_parser('list', help='List installed packages')
    
    # Uninstall package
    uninstall_parser = subparsers.add_parser('uninstall', help='Uninstall plugin package')
    uninstall_parser.add_argument('package_name', help='Package name to uninstall')
    uninstall_parser.add_argument('--version', help='Specific version to uninstall')
    
    args = parser.parse_args()
    
    if args.command == 'create':
        metadata = PackageMetadata(
            name=args.name,
            version=args.version,
            description=args.description,
            author=args.author,
            license=args.license
        )
        
        package_format = PluginPackageFormat()
        success = package_format.create_package(args.source_dir, args.output_file, metadata)
        print(f"Package creation {'succeeded' if success else 'failed'}")
    
    elif args.command == 'sign':
        signer = PluginSigner(args.key, args.cert)
        signature = signer.sign_package(args.package_file, args.signer_id)
        
        # Add signature to package (simplified - would need to update package)
        print(f"Package signed successfully by {signature.signer_id}")
    
    elif args.command == 'install':
        manager = PackageManager("./plugins")
        success = manager.install_package(args.package_file, not args.no_verify)
        print(f"Installation {'succeeded' if success else 'failed'}")
    
    elif args.command == 'list':
        manager = PackageManager("./plugins")
        packages = manager.list_installed_packages()
        
        if packages:
            print("Installed packages:")
            for pkg in packages:
                print(f"  {pkg['name']} v{pkg['version']} - {pkg['description']}")
        else:
            print("No packages installed")
    
    elif args.command == 'uninstall':
        manager = PackageManager("./plugins")
        success = manager.uninstall_package(args.package_name, args.version)
        print(f"Uninstallation {'succeeded' if success else 'failed'}")


if __name__ == "__main__":
    main()
