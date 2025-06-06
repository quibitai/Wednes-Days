# AI Features Setup Documentation

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_FALLBACK_MODEL=gpt-4o-mini

# Supabase Configuration (for vector storage)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Vercel Blob Configuration
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
BLOB_BASE_URL=your-blob-base-url

# AI Cost Management (Optional - defaults provided)
AI_COST_LIMIT_MONTHLY=50
AI_COST_LIMIT_DAILY=5

# AI Feature Flags (Optional - defaults to enabled)
AI_NLP_ENABLED=true
AI_PATTERNS_ENABLED=true
AI_EXPLANATIONS_ENABLED=true
AI_OPTIMIZATION_ENABLED=true
AI_VECTOR_SEARCH_ENABLED=true

# AI Cache Configuration (Optional)
AI_CACHE_TTL=3600
AI_CACHE_MAX_SIZE=1000
AI_CACHE_ENABLED=true

# Development Settings (Optional)
AI_LOG_LEVEL=info
AI_MOCK_RESPONSES=false
```

## Setup Steps

### 1. OpenAI Setup
1. Get API key from https://platform.openai.com/api-keys
2. Add `OPENAI_API_KEY` to your environment variables

### 2. Supabase Setup (for vector embeddings)
1. Create project at https://supabase.com
2. Go to Settings → API to get URL and keys
3. Add Supabase environment variables
4. Run the following SQL to create required tables:

```sql
-- Enable the vector extension
create extension if not exists vector;

-- Create proposals table
create table schedule_proposals (
  id uuid default gen_random_uuid() primary key,
  created_by text not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  status text not null check (status in ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')),
  title text not null,
  message text,
  unavailable_dates text[],
  original_schedule jsonb,
  proposed_schedule jsonb,
  affected_date_range jsonb,
  handoff_reduction jsonb,
  fairness_impact jsonb,
  ai_confidence float,
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_reason text
);

-- Create AI interactions table
create table ai_interactions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  timestamp timestamptz default now(),
  type text not null,
  user_input text not null,
  ai_response text not null,
  structured_output jsonb,
  response_time_ms integer,
  tokens_used jsonb,
  cost_cents integer,
  user_feedback text,
  success boolean default true,
  error_message text
);

-- Create user patterns table with vector embeddings
create table user_patterns (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  pattern_type text not null,
  pattern text not null,
  frequency integer default 1,
  confidence float default 0.5,
  last_seen timestamptz default now(),
  embedding vector(1536), -- text-embedding-3-small dimension
  seasonality text,
  day_of_week text,
  metadata jsonb
);

-- Create indexes
create index on schedule_proposals (created_by, status);
create index on schedule_proposals (expires_at);
create index on ai_interactions (user_id, timestamp);
create index on user_patterns (user_id, pattern_type);
create index on user_patterns using ivfflat (embedding vector_cosine_ops);
```

### 3. Vercel Blob Setup
1. In Vercel dashboard, go to Storage → Blob
2. Create a new blob store
3. Copy the token and base URL to environment variables

### 4. Development Testing
1. Set `AI_MOCK_RESPONSES=true` for development without API costs
2. Use `AI_LOG_LEVEL=debug` for detailed logging
3. Start with lower cost limits during testing

## Feature Overview

### Phase 1: Foundation ✅
- AI configuration system
- OpenAI GPT-4.1-mini integration
- Cost tracking and limits
- Error handling and fallbacks

### Phase 2: Natural Language Interface
- Parse user requests like "I'm unavailable next week Tuesday and Wednesday"
- Convert to structured schedule actions
- Validate and confirm understanding

### Phase 3: Smart Optimization
- Analyze schedule conflicts
- Generate optimized proposals
- Minimize handoffs while respecting constraints
- AI-powered fairness evaluation

### Phase 4: Learning & Patterns
- Track user preferences over time
- Learn from proposal acceptance/rejection patterns
- Personalized optimization suggestions
- Predictive conflict detection

### Phase 5: Enhanced UX
- Real-time explanations of schedule changes
- Natural language responses
- Confidence indicators
- Interactive proposal refinement

## Cost Estimates

Based on typical usage:
- **GPT-4.1-mini**: ~$0.0001 per 1K input tokens, ~$0.0004 per 1K output tokens
- **Embeddings**: ~$0.00002 per 1K tokens
- **Expected monthly cost**: $5-15 for typical family usage

## Security Notes

- API keys are server-side only (not exposed to client)
- User data is anonymized for AI training prevention
- All AI requests include rate limiting
- Cost limits prevent runaway usage
- Fallback to algorithmic methods if AI fails 