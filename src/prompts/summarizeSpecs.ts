export const summarizeSpecs = `

Please read the repository at this directory. It's a software project. Your role is to analyze the project and summarize the specifications of the project. The specifications should be in a markdown format.

The target of the specifications is to provide a detailed and informative description of the project, including its features, functionalities, and requirements. The specifications should be comprehensive and cover all aspects of the project, such as user interface, project management, and any other relevant components. 

You need to create a file called "output_specs.md" in the root directory of the project, and write the specifications in that file. 

User will use the specifications version v1 to understand the project and its requirements, modify the project, and do code implementation or code refactoring in version v2. So please follow the instructions below to write the specifications:

1. API Contract (Most Critical)

You must preserve:

Endpoint paths (/users/{id})

HTTP methods (GET vs POST)

Request schema

Response schema

Field names

Field types

Required vs optional

Error format

Status codes

Authentication mechanism

Pagination format

If using:

REST → OpenAPI spec

GraphQL → Schema

gRPC → Protobuf

This is usually the #1 compatibility layer.

2. Data Schema (Database Contract)

If external services or old code depend on DB structure, you must preserve:

Table names

Column names

Column types

Constraints

Index behavior (sometimes)

Default values

Nullability

Enum values

Backward-compatible DB changes:

Add nullable column ✅

Add new table ✅

Add index ✅

Breaking changes:

Remove column ❌

Rename column ❌

Change type ❌

Change meaning of enum ❌

3. Event / Message Contracts

If your system publishes events (Kafka, SNS, SQS):

You must preserve:

Topic names

Event schema

Field names/types

Event semantics

Breaking event schema breaks downstream consumers.

4. Storage Format Contract

If you store files (S3, local FS, blob storage):

Preserve:

Directory structure

File naming pattern

Serialization format (JSON vs Avro vs CSV)

Compression type

Encoding (UTF-8, etc.)

Version markers

Especially important for:

Data pipelines

ML systems

Analytics jobs

5. Network-Level Contract (Usually Less Important)

Domain/IP/port are typically deployment details — not spec-level contracts.

Preserve ONLY if:

Hardcoded clients depend on them

Third-party integrations use fixed URLs

Best practice:
Hide these behind DNS + versioned paths.

So this is environment compatibility, not logical compatibility.

6. Authentication & Authorization Model

Preserve:

Token format (JWT claims)

OAuth scopes

Role names

Permission logic

Header format

Changing auth can silently break integrations.

7. Business Logic Semantics (Often Forgotten)

Even if API schema doesn’t change, behavior might.

Example:

Old: discount = 10%

New: discount = 10% only above $100

That’s breaking compatibility.

You must preserve:

Meaning of fields

Calculation rules

Side effects

Transaction behavior

This is semantic compatibility.

8. Error & Edge Case Behavior

Clients sometimes depend on:

Specific error codes

Retry behavior

Idempotency behavior

Timeout behavior

Ordering guarantees

Even changing error message format can break strict clients.

9. Configuration & Environment Contracts

Sometimes forgotten:

Environment variables

Feature flags

CLI flags

Startup parameters

Terraform variable names

Breaking these breaks deployment pipelines.

10. Observability Contract (Advanced)

If other systems parse:

Log formats

Metric names

Prometheus labels

Tracing fields

Changing them can break monitoring or billing.

Compatibility Checklist

---

To ensure V2 is backward-compatible with V1, preserve:

External Interface Layer

API schema

Event schema

File format

CLI interface

Data Layer

DB schema

Storage format

Migration behavior

Semantic Layer

Business rules

Side effects

Transaction guarantees

Infrastructure Contract

URLs (if public)

Auth mechanism

IAM roles

Environment config

------

Professional Approach:

Large organizations like Amazon and Google enforce:

Strict API versioning

Backward-compatible database migrations

Event schema registry validation

Contract testing (consumer-driven tests)

Semantic versioning rules

`;