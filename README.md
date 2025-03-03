# Node Express RealWorld Example App

## Article Service Implementation

### Caching Strategy

#### Overview

The article service implements a Redis-based caching mechanism to improve performance and reduce database load. The implementation follows a cache-aside pattern with write-through updates.

#### Key Design Decisions

1. **Caching Layer Placement**

   - **Decision**: Cache implementation resides in the service layer (`article.service.ts`) rather than the controller layer (`article.controller.ts`)

   - **Benefits**:

     - Data-centric caching rather than request-centric
     - Cache reusability across different endpoints
     - Consistent cache invalidation strategy
     - Single source of truth for data operations
     - Separation of concerns: controllers handle HTTP, services handle data

   - **Trade-offs**:

     - Cannot cache based on specific request parameters (headers, query params)
     - Less granular control over caching per endpoint
     - Need to handle cache serialization/deserialization in service layer
     - Potential over-caching of data that might only be needed by one endpoint

   - **Why This Approach**:

     1. **Data Consistency**: Service layer caching ensures all data operations go through the same cache
     2. **Business Logic**: Caching is part of data retrieval strategy, not HTTP handling
     3. **Maintainability**: Cache invalidation is closer to data mutations
     4. **Reusability**: Cached data can be used by multiple endpoints or internal service calls

2. **Dependency Injection Pattern**

   ```typescript
   const redis = cache.getClient();
   ```

   - **Benefits**:
     - Singleton Redis client instance
     - Better testability through potential mock injection
     - Centralized connection management
   - **Trade-offs**:
     - Module-level singleton vs. per-request client
     - Need to handle connection failures gracefully

3. **Cache Invalidation Strategy**

   - **Write-through**: Cache is updated immediately when data changes
   - **Targeted Invalidation**: Only affected entries are invalidated
   - **Examples**:

   - **Trade-offs**:
     - Consistency vs. Performance
     - More complex code vs. Simpler invalidation
     - Higher write latency vs. Always fresh reads

### Performance Optimizations

1. **Selective Loading**

   ```typescript
   include: {
     tagList: {
       select: {
         name: true,
       },
     },
     author: {
       select: {
         username: true,
         bio: true,
         image: true,
         followedBy: true,
       },
     }
   }
   ```

   - **Benefits**:
     - Reduced data transfer
     - Smaller cache entries
     - Faster serialization/deserialization
   - **Trade-offs**:
     - Multiple queries might be needed for different views
     - Need to maintain selection sets

2. **Cache TTL**
   ```typescript
   const CACHE_TTL = 3600; // 1 hour
   ```
   - **Considerations**:
     - Balance between freshness and cache hit rate
     - Memory usage vs. data staleness
     - Different TTLs for different operations

### Experiences with Cursor and AI-Assisted Development

This project was intentionally developed with Cursor to evaluate how AI might approach caching implementation, considering that candidates might use AI-assisted development tools. Here are key observations and potential pitfalls in AI-suggested solutions:

1. **Controller-Layer Caching**

   - **Why It's Problematic**:

     - Couples caching to HTTP layer instead of data layer
     - Makes cache invalidation difficult

2. **Over-Complicated Cache Keys**

   ```typescript
   // AI often suggests this pattern
   const cacheKey = `article:${slug}:${userId}:${queryParams}:${version}`;
   // or worse
   const cacheKey = hash(JSON.stringify(request));
   ```

   - **Why It's Problematic**:

     - Cache explosion with unique keys per request
     - Difficult to predict and manage key patterns
     - Memory inefficiency

   - **Refined Solution**:
     ```typescript
     const cacheKey = `article:${slug}`;
     ```
     - Simple, predictable key structure
     - Data-centric rather than request-centric
     - Easy to reason about and maintain

3. **Over-Engineered Cache Architecture**

   - Creates a general Cache Service and then additionally tailored Cache Services per module (such as articles)

   - **Why It's Problematic**:

     - Unnecessary abstraction layers
     - Complexity without clear benefits
     - Harder to maintain and test
     - Rigid structure that's difficult to modify

   - **Refined Solution**:
     - Minimal, functional design with a Singleton for the cache client and setter, getter methods using dependency injection for the client
     - Clear dependencies
     - Easy to test and modify

## How to Run locally

### Prerequisites

Run the following command to install dependencies:

```shell
npm install
```

### Environment variables

This project depends on some environment variables.
If you are running this project locally, create a `.env` file at the root for these variables.
Your host provider should included a feature to set them there directly to avoid exposing them.

Here are the required ones:

```
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
```

### Run a local Redis instance
You need to run a local redis instance on localhost - port 6379

### Generate your Prisma client

Run the following command to generate the Prisma Client which will include types based on your database schema:

```shell
npx prisma generate
```

### Apply any SQL migration script

Run the following command to create/update your database based on existing sql migration scripts:

```shell
npx prisma migrate deploy
```

### Run the project

Run the following command to run the project:

```shell
npx nx serve api
```

### Seed the database

The project includes a seed script to populate the database:

```shell
npx prisma db seed
```

## How to Test locally
A simple approach can be taken to test the solution.
- Use the `GET /articles` route to retrieve all articles
- Call the endpoint a second time and compare the response time between the first and second call. It should have decreased because of the cache hit.

- Use the `POST /articles` endpoint to create an article
- Call the `GET /articles` endpoint again - it should include the newly created article (testing cache invalidation)

- Use the `PUT /articles/:slug` and the `DELETE /articles/:slug`endpoints to both create and delete an article
- After each of them call the `GET /articles` endpoint again to see if the cache was invalidaed properly