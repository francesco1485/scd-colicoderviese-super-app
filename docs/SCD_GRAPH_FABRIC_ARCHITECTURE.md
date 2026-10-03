# SCD GRAPH FABRIC ARCHITECTURE

## Goal
Create a Meta-style relationship-aware club data fabric without introducing a second source of truth.

## Canonical approach
PostgreSQL/Supabase remains the domain core. Graph behavior is produced from stable entities and explicit relations.

### Core nodes
PERSON, FAMILY, ATHLETE, STAFF, TEAM, EVENT, MATCH, FACILITY, DOCUMENT, ORGANIZATION, SPONSOR, CONTACT, TASK, PAYMENT, COMMUNICATION, MEDIA.

### Core edges
PERSON->FAMILY, ATHLETE->PERSON, PERSON->ROLE, ATHLETE->TEAM, STAFF->TEAM, EVENT->TEAM, EVENT->FACILITY, EVENT->TRANSPORT, DOCUMENT->ENTITY, SPONSOR->CONTACT, SPONSOR->OPPORTUNITY, COMMUNICATION->ENTITY, SOURCE_RECORD->ENTITY.

## Storage rule
Prefer dedicated relation tables for operational relationships. Use derived views/materialized views for graph traversal. A generic edge table may be added later for secondary relationships, never as a replacement for domain constraints.

## Provenance
Every imported or derived relationship must carry source_id/source_record_id, verified_at, confidence or trust class, transformation and correlation ID where available.

## AI layer
AI retrieval uses permission-filtered graph context. Embeddings/vector search are optional retrieval helpers, not identity or authorization truth.

## Performance
Before adding graph technology, measure:
- traversal depth;
- query latency;
- edge count;
- materialization cost;
- realtime fan-out;
- index usage.

## Migration principle
No production schema mutation during R57. Prepare migrations and tests only.
