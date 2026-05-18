# Git Workflow

## Branch strategy
- Active development branch: `aws-deployment`
- Default/source-of-truth branch: `main`

## Push rule — ALWAYS push to both branches
Every commit must be pushed to both `aws-deployment` AND `main`.

```bash
git push origin aws-deployment
git push origin aws-deployment:main
```

Or in one command:
```bash
git push origin aws-deployment aws-deployment:main
```

Never push to `aws-deployment` only and leave `main` behind.

## Deploy triggers
- `aws-deployment` push → triggers API Docker build + ECR push (App Runner auto-deploys)
- `aws-deployment` push with `ghara-marketing/**` changes → triggers S3/CloudFront deploy
- `ghara/` changes → Vercel auto-deploys from the connected branch
