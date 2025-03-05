# Kubernetes Update Instructions

I've updated your Kubernetes configurations to account for all the changes made to the frontend and backend services. Here's what changed:

## 1. Frontend Updates

- Created a new ConfigMap for the nginx configuration
- Updated the frontend deployment to mount the nginx configuration
- Added environment variables for API_URL to connect to the backend

## 2. Backend Updates

- Updated the values.yaml to include service URL and ChromaDB configuration
- Improved health check configuration with better timeouts and retry settings
- Added annotations to trigger redeployment when ConfigMaps or Secrets change

## 3. How to Apply the Changes

1. First, update your local images (if needed):
```bash
# From project root
docker-compose build frontend backend
docker tag podai-frontend:latest YOUR_REGISTRY/podai-frontend:latest
docker tag podai-backend:latest YOUR_REGISTRY/podai-backend:latest
docker push YOUR_REGISTRY/podai-frontend:latest
docker push YOUR_REGISTRY/podai-backend:latest
```

2. Apply the Kubernetes updates:
```bash
# From project root
kubectl apply -f kubernetes/charts/podai/templates/
```

OR use Helm if you're using it:
```bash
# From project root
helm upgrade podai kubernetes/charts/podai
```

## 4. Verify the Deployment

1. Check that all pods are running:
```bash
kubectl get pods
```

2. Check the logs for any errors:
```bash
kubectl logs -l app=podai-frontend
kubectl logs -l app=podai-backend
```

3. Access your application:
```bash
kubectl port-forward svc/podai-frontend 8080:80
```
Then visit http://localhost:8080 in your browser.

## 5. Key Changes Summary

- Frontend is now using esbuild instead of Vite
- Backend has proper logging with setup_logger function
- Nginx configuration properly serves static files from the correct directory
- Health checks are more robust with better timeout/retry configuration 