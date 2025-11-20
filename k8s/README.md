# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the EduCRM platform in production and staging environments.

## Directory Structure

```
k8s/
├── base/                    # Base configuration for all environments
│   ├── namespace.yaml       # Namespace definitions
│   ├── configmap.yaml       # ConfigMaps for environment variables
│   ├── postgres.yaml        # PostgreSQL StatefulSet
│   ├── redis.yaml           # Redis Deployment
│   ├── microservice-deployment.yaml  # Template for microservices
│   ├── frontend.yaml        # Frontend Next.js deployment
│   └── ingress.yaml         # Ingress controller with SSL
├── production/              # Production-specific overlays
└── staging/                 # Staging-specific overlays
```

## Prerequisites

1. **Kubernetes Cluster** (v1.27+)
   - GKE, EKS, AKS, or self-hosted
   - At least 3 nodes with 4 CPU, 8GB RAM each

2. **kubectl** configured with cluster access
   ```bash
   kubectl version --client
   ```

3. **cert-manager** for SSL certificates
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

4. **NGINX Ingress Controller**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
   ```

## Deployment Steps

### 1. Create Secrets

Before deploying, create required secrets:

```bash
# PostgreSQL credentials
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=<strong-password> \
  --from-literal=POSTGRES_DB=educrm_prod \
  -n educrm-production

# Application secrets
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET=<jwt-secret> \
  --from-literal=SESSION_SECRET=<session-secret> \
  -n educrm-production
```

### 2. Deploy Infrastructure

```bash
# Apply namespaces
kubectl apply -f base/namespace.yaml

# Deploy PostgreSQL
kubectl apply -f base/postgres.yaml

# Deploy Redis
kubectl apply -f base/redis.yaml

# Verify databases are running
kubectl get pods -n educrm-production
```

### 3. Deploy ConfigMaps

```bash
kubectl apply -f base/configmap.yaml
```

### 4. Deploy Microservices

```bash
# Deploy API Gateway
kubectl apply -f base/microservice-deployment.yaml

# Deploy Frontend
kubectl apply -f base/frontend.yaml

# For each additional service, duplicate microservice-deployment.yaml
# and update the service name, port, and image
```

### 5. Deploy Ingress

```bash
kubectl apply -f base/ingress.yaml
```

### 6. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n educrm-production

# Check services
kubectl get svc -n educrm-production

# Check ingress
kubectl get ingress -n educrm-production

# Check HPA status
kubectl get hpa -n educrm-production
```

## Monitoring

### View Logs

```bash
# View logs for a specific pod
kubectl logs -f <pod-name> -n educrm-production

# View logs for a deployment
kubectl logs -f deployment/api-gateway -n educrm-production
```

### Metrics

Prometheus metrics are exposed at `/metrics` on each service port.

```bash
# Port-forward to access metrics
kubectl port-forward svc/api-gateway 3000:3000 -n educrm-production
curl http://localhost:3000/metrics
```

## Scaling

### Manual Scaling

```bash
# Scale a deployment
kubectl scale deployment api-gateway --replicas=5 -n educrm-production
```

### Horizontal Pod Autoscaler

HPA is already configured for frontend and api-gateway:
- Min replicas: 3
- Max replicas: 10
- CPU threshold: 70%
- Memory threshold: 80%

## Rolling Updates

```bash
# Update image for a deployment
kubectl set image deployment/api-gateway \
  api-gateway=educrm/api-gateway:v2.0.0 \
  -n educrm-production

# Check rollout status
kubectl rollout status deployment/api-gateway -n educrm-production

# Rollback if needed
kubectl rollout undo deployment/api-gateway -n educrm-production
```

## Database Migrations

Run migrations as a Kubernetes Job:

```bash
kubectl run db-migrate \
  --image=educrm/api-gateway:latest \
  --restart=Never \
  --env="NODE_ENV=production" \
  --command -- node database/migrate.js \
  -n educrm-production

# Check job status
kubectl logs db-migrate -n educrm-production
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n educrm-production
kubectl logs <pod-name> -n educrm-production
```

### Service Not Accessible

```bash
kubectl get endpoints <service-name> -n educrm-production
kubectl describe svc <service-name> -n educrm-production
```

### Ingress Issues

```bash
kubectl describe ingress educrm-ingress -n educrm-production
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

## Production Checklist

- [ ] Secrets are strong and not committed to version control
- [ ] Resource limits are configured for all pods
- [ ] HPA is enabled for scalable services
- [ ] Liveness and readiness probes are configured
- [ ] SSL certificates are valid
- [ ] Monitoring and logging are set up
- [ ] Backup strategy is in place for databases
- [ ] Disaster recovery plan is documented

## Cleanup

To remove all resources:

```bash
kubectl delete namespace educrm-production
kubectl delete namespace educrm-staging
```

## Support

For issues, please refer to:
- Internal documentation
- Kubernetes logs: `kubectl logs -n educrm-production`
- GitHub Issues: [project repository]
