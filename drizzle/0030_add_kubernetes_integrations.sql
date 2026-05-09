-- Phase 3: Add Kubernetes integrations table for OpenCost / EKS Container Insights
CREATE TABLE IF NOT EXISTS "kubernetes_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "cluster_name" text NOT NULL,
  "connection_type" text NOT NULL DEFAULT 'opencost', -- 'opencost' | 'eks_container_insights'
  "endpoint_url" text,                                -- OpenCost API URL
  "encrypted_token" text,                             -- Bearer token (encrypted)
  "aws_integration_id" uuid REFERENCES "integrations"("id") ON DELETE SET NULL, -- for EKS fallback
  "status" text NOT NULL DEFAULT 'connected',         -- 'connected' | 'disconnected' | 'error'
  "last_synced_at" timestamp,
  "last_error" text,
  "last_error_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_k8s_integrations_org_id" ON "kubernetes_integrations" ("org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_k8s_integrations_org_cluster" ON "kubernetes_integrations" ("org_id", "cluster_name");
