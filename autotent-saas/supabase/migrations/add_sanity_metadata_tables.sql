-- Create Sanity Authors Table
create table if not exists sanity_authors (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade not null,
  sanity_id text not null,
  name text not null,
  updated_at timestamptz default now(),
  unique(project_id, sanity_id)
);

-- Create Sanity Categories Table
create table if not exists sanity_categories (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade not null,
  sanity_id text not null,
  title text not null,
  updated_at timestamptz default now(),
  unique(project_id, sanity_id)
);

-- Enable RLS for new tables
alter table sanity_authors enable row level security;
alter table sanity_categories enable row level security;

-- Policies for sanity_authors
create policy "Users can view their project authors" on sanity_authors
  for select using (
    exists (
      select 1 from projects
      where projects.id = sanity_authors.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can insert their project authors" on sanity_authors
  for insert with check (
    exists (
      select 1 from projects
      where projects.id = sanity_authors.project_id
      and projects.user_id = auth.uid()
    )
  );
  
create policy "Users can update their project authors" on sanity_authors
  for update using (
    exists (
      select 1 from projects
      where projects.id = sanity_authors.project_id
      and projects.user_id = auth.uid()
    )
  );


-- Policies for sanity_categories
create policy "Users can view their project categories" on sanity_categories
  for select using (
    exists (
      select 1 from projects
      where projects.id = sanity_categories.project_id
      and projects.user_id = auth.uid()
    )
  );
  
create policy "Users can insert their project categories" on sanity_categories
  for insert with check (
    exists (
      select 1 from projects
      where projects.id = sanity_categories.project_id
      and projects.user_id = auth.uid()
    )
  );
  
create policy "Users can update their project categories" on sanity_categories
  for update using (
    exists (
      select 1 from projects
      where projects.id = sanity_categories.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Add Columns to Jobs Table
alter table jobs add column if not exists sanity_author_id text;
alter table jobs add column if not exists sanity_category_id text;
