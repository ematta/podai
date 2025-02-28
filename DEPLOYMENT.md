# PodAI Deployment Guide

This document provides instructions for deploying PodAI using Docker and Kubernetes.

## Docker Deployment

### Prerequisites
- Docker and Docker Compose installed

### Building Images
```bash
# Build all images
make docker-build

# Build backend only
make docker-build-backend

# Build frontend only
make docker-build-frontend
```

### Running Containers
```bash
# Start all services
make docker-up

# Stop all services
make docker-down

# View logs
make docker-logs

# List running containers
make docker-ps
```

### Accessing the Application
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster
- Helm installed
- kubectl configured

### Installation
```bash
# Install the application
make k8s-install

# Upgrade the application
make k8s-upgrade

# Uninstall the application
make k8s-uninstall

# Check status
make k8s-status
```

### Accessing the Application
```bash
# Port forward to access services locally
make k8s-forward-frontend  # Frontend at http://localhost:8080
make k8s-forward-backend   # Backend at http://localhost:3000
```

### Configuration

All configuration options are available in the Helm chart's values.yaml file:
```yaml
# Main configuration
frontend:
  replicaCount: 1
  image:
    repository: podai-frontend
    tag: latest

backend:
  replicaCount: 1
  image:
    repository: podai-backend
    tag: latest

# Ingress configuration
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: podai.example.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
        - path: /api
          pathType: Prefix
          service: backend
```

## Persistent Storage

The application uses persistent volumes for:
- Backend uploads
- Backend data

You can configure storage classes and sizes in the Helm values file.

## Monitoring and Logs

To view application logs:
```bash
# Docker
make docker-logs

# Kubernetes
kubectl logs -l app=podai-backend
kubectl logs -l app=podai-frontend
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 3000 and 8080 are available
2. **Missing environment variables**: Check required environment variables
3. **Storage issues**: Verify persistent volume claims are bound

### Debugging
```bash
# Get pod status
kubectl get pods

# Describe pod
kubectl describe pod <pod-name>

# Get events
kubectl get events --sort-by=.metadata.creationTimestamp
```
