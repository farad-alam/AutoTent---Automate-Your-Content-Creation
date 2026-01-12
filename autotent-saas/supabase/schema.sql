-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects Table
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  sanity_project_id text not null,
  sanity_dataset text not null,
  sanity_token text not null, -- In a real app, this should be encrypted
  created_at timestamptz default now()
);

-- Enable RLS
alter table projects enable row level security;

create policy "Users can view their own projects" on projects
  for select using (auth.uid() = user_id);

create policy "Users can insert their own projects" on projects
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own projects" on projects
  for update using (auth.uid() = user_id);

create policy "Users can delete their own projects" on projects
  for delete using (auth.uid() = user_id);

-- Jobs Table
create table jobs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade not null,
  user_id uuid references auth.users not null,
  keyword text not null,
  scheduled_for timestamptz, -- When the job is scheduled to run
  status text default 'pending' check (status in ('pending', 'scheduled', 'processing', 'completed', 'failed')),
  result_title text,
  result_url text, -- Link to the published post or Sanity document
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table jobs enable row level security;

create policy "Users can view their own jobs" on jobs
  for select using (auth.uid() = user_id);

create policy "Users can insert their own jobs" on jobs
  for insert with check (auth.uid() = user_id);
