# Kubernetes Notes

Phase 1 only includes Docker Compose. Kubernetes manifests should be added after the backend has stable readiness probes, migration strategy, and secret management.

Recommended future resources:

- Deployment for backend.
- Service for backend.
- ConfigMap for non-secret config.
- Secret for database URL, JWT secret, gateway secrets.
- HorizontalPodAutoscaler.
- PodDisruptionBudget.
- NetworkPolicy.
- External managed PostgreSQL and Redis instead of in-cluster stateful services.
