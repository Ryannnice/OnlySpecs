export const summarizeSpecs = `

Please read the repository at this directory. It's a software project. Your role is to analyze the project and summarize the specifications of the project. The specifications should be in a markdown format.

The target of the specifications is to provide a VERY VERY detailed and informative description of the project, including its features, functionalities, and requirements. The specifications should be comprehensive and cover all aspects of the project, such as user interface, project management, and any other relevant components. 

You need to create a file called "output_specs.md" in the root directory of the project, and write the specifications in that file. 

User will use the specifications version v1 to understand the project and its requirements, modify the project, and do code implementation or code refactoring in version v2. So please follow the instructions below to write the specifications:

📘 MASTER SOFTWARE SPECIFICATION DOCUMENT

(System Definition & Boundary Contract Document)

1️⃣ Executive Overview
1.1 System Purpose

What problem does the system solve?

Who are the primary users?

What business goals does it support?

What is explicitly out of scope?

1.2 System Context

Where does this system sit in the ecosystem?

What external systems interact with it?

What are upstream and downstream dependencies?

1.3 System Boundary Definition (CRITICAL)

Clearly define:

What is inside this system

What is outside

What data crosses boundaries

Who owns which responsibility

This prevents architectural drift.

2️⃣ Overall Functional Specification
2.1 Core Capabilities

List major features grouped by domain.

2.2 Use Cases

For each use case:

Actor

Preconditions

Main flow

Alternative flows

Failure cases

Postconditions

2.3 User Roles

Role definitions

Capabilities

Access scope

3️⃣ Overall Behavioral Design

This defines semantic compatibility.

3.1 Domain Model

Define:

Entities

Value objects

Aggregates

Relationships

Invariants

3.2 State Machines

For each major entity:

States

Valid transitions

Transition triggers

Illegal transitions

Timeout behavior

3.3 Business Rules

Define explicitly:

Validation rules

Calculation formulas

Side effects

Idempotency rules

Ordering guarantees

Consistency expectations

3.4 Workflow & Orchestration

Sync vs async flows

Background jobs

Scheduled tasks

Event-driven flows

Saga / transaction coordination

4️⃣ Overall System Architecture
4.1 Architecture Style

Monolith / Microservices / Modular Monolith / Event-Driven

Rationale

4.2 Component Breakdown

For each component:

Responsibility

Inputs

Outputs

Dependencies

Ownership

4.3 Communication Model

REST / gRPC / GraphQL

Messaging system

Sync vs async boundaries

Retry policy

Circuit breaking

Timeout rules

4.4 Deployment Topology

Runtime units

Scaling strategy

Load balancing

Multi-region strategy

5️⃣ API & Interface Contracts
5.1 Public APIs

For each endpoint:

Path

Method

Request schema

Response schema

Status codes

Error model

Versioning policy

Deprecation policy

5.2 Internal APIs

Service-to-service contracts

Authentication between services

5.3 Event Contracts

Topic names

Event schema

Required fields

Ordering guarantees

Retry semantics

5.4 Webhooks

Payload schema

Delivery guarantee

Signature verification

6️⃣ Data & Persistence Design
6.1 Database Choice

SQL / NoSQL / Hybrid

Rationale

6.2 Schema Definition

Tables / collections

Fields and types

Nullability

Constraints

Indexes

Enum values

6.3 Migration Strategy

Backward compatibility rules

Zero-downtime migrations

Data transformation policies

6.4 Transaction Model

Isolation level

Cross-entity consistency rules

Compensating transactions

6.5 Caching Strategy

What is cached?

TTL

Invalidation rules

Cache consistency guarantees

7️⃣ Storage & File Design

If files are stored:

Storage provider

Directory structure

Naming conventions

Serialization format

Encoding

Compression

Retention policy

Versioning scheme

8️⃣ Security & Access Control
8.1 Authentication

Mechanism (JWT, OAuth, API Key, Session)

Token format

Expiration rules

8.2 Authorization

RBAC / ABAC model

Permission definitions

Scope model

Multi-tenant isolation rules

8.3 Data Protection

Encryption at rest

Encryption in transit

Key management

PII handling

8.4 Audit Logging

What actions are logged?

Log schema

Retention policy

9️⃣ Non-Functional Requirements
9.1 Performance

Expected latency

Throughput targets

Concurrency limits

9.2 Scalability

Horizontal scaling rules

Bottleneck analysis

9.3 Availability

SLA

Failover design

Backup strategy

9.4 Consistency Model

Strong / Eventual

Read-after-write guarantees

9.5 Reliability

Retry rules

Idempotency rules

Dead-letter handling

🔟 Configuration & Environment
10.1 Environment Definition

Dev / Staging / Production

Config differences

10.2 Environment Variables

Required variables

Defaults

Validation rules

10.3 Feature Flags

Flag definitions

Default states

Rollout strategy

1️⃣1️⃣ Technology Stack
11.1 Programming Language(s)

Version

Rationale

11.2 Frameworks

Web framework

ORM

Messaging library

11.3 Infrastructure

Cloud provider

Containerization

Orchestration

CI/CD pipeline

11.4 Third-Party Dependencies

For each:

Purpose

Version constraints

Replacement strategy

1️⃣2️⃣ Dependency Graph

Internal module dependencies

External service dependencies

Database dependencies

Version compatibility requirements

Include:

Upgrade policy

Breaking-change detection policy

1️⃣3️⃣ Observability & Operations
13.1 Logging

Log format

Required fields

Correlation ID

13.2 Metrics

Key business metrics

System metrics

Naming conventions

13.3 Tracing

Distributed tracing strategy

Trace propagation format

13.4 Monitoring & Alerts

Threshold definitions

Escalation policy

1️⃣4️⃣ Testing Strategy
14.1 Unit Testing

Coverage requirement

14.2 Integration Testing

Contract tests

DB integration tests

14.3 Backward Compatibility Tests

API contract tests

Event schema validation

Migration validation

14.4 Load Testing

Methodology

Target thresholds

1️⃣5️⃣ Versioning & Compatibility Policy
15.1 Semantic Versioning Rules

What constitutes breaking change?

15.2 API Versioning

URL versioning / Header versioning

15.3 Data Migration Policy

Allowed schema changes

Disallowed changes

15.4 Deprecation Timeline

Support window

Migration communication plan

1️⃣6️⃣ Constraints & Assumptions

Regulatory requirements

Budget limits

Team size

Timeline

Technology restrictions

🧠 The 7 Core Boundaries This Document Defines

This master document protects:

Interface Boundary

Data Boundary

Behavioral Boundary

Security Boundary

Operational Boundary

Infrastructure Boundary

Versioning Boundary

If these are preserved, the system can be safely rewritten or regenerated.

`;