#!/bin/bash

# Digital Ocean Droplet Initial Setup Script
# Run this script on your fresh Ubuntu droplet to install required dependencies

set -e

echo "🔧 Setting up Digital Ocean droplet for Automated Document Analysis Tool..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
print_status "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add user to docker group (if not root)
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
    print_status "Added $SUDO_USER to docker group"
fi

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Install Java 17 (for Spring Boot)
print_status "Installing Java 17..."
apt install -y openjdk-17-jdk

# Install Node.js 18 (for React build)
print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Python 3 and pip (usually pre-installed on Ubuntu)
print_status "Installing Python 3 and pip..."
apt install -y python3 python3-pip python3-dev

# Configure firewall
print_status "Configuring UFW firewall..."
ufw allow OpenSSH
ufw allow 80/tcp    # Frontend
ufw allow 8080/tcp  # Backend API
ufw allow 5000/tcp  # Flask service
ufw allow 5001/tcp  # YOLO service
ufw --force enable

# Create application directory
print_status "Creating application directory..."
mkdir -p /opt/document-analysis-tool
chown -R $SUDO_USER:$SUDO_USER /opt/document-analysis-tool 2>/dev/null || true

# Create swap file (helpful for memory-intensive operations)
print_status "Creating swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

# Optimize Docker for production
print_status "Optimizing Docker for production..."
cat > /etc/docker/daemon.json << EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}
EOF

systemctl restart docker

# Clean up
print_status "Cleaning up..."
apt autoremove -y
apt autoclean

print_status "✅ Server setup completed!"
echo ""
print_warning "Important next steps:"
echo "1. Log out and log back in for Docker group changes to take effect"
echo "2. Clone your repository to /opt/document-analysis-tool"
echo "3. Configure your .env file with proper credentials"
echo "4. Run the deploy.sh script"
echo ""
echo "System Information:"
echo "- Docker version: $(docker --version)"
echo "- Docker Compose version: $(docker-compose --version)"
echo "- Java version: $(java -version 2>&1 | head -n 1)"
echo "- Node.js version: $(node --version)"
echo "- Python version: $(python3 --version)"
echo ""
print_status "🎉 Your droplet is ready for deployment!" 