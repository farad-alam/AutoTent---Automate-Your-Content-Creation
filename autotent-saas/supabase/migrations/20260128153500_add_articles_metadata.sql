-- Create articles_metadata table for internal linking
create table if not exists articles_metadata (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  sanity_document_id text not null,
  title text not null,
  slug text not null,
  excerpt text,
  focus_keyword text,
  word_count integer,
  published_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table articles_metadata enable row level security;

create policy "Users can view their own articles metadata" on articles_metadata
  for select using (auth.uid() = (select user_id from projects where id = articles_metadata.project_id));

create policy "Users can insert their own articles metadata" on articles_metadata
  for insert with check (auth.uid() = (select user_id from projects where id = articles_metadata.project_id));

create policy "Users can update their own articles metadata" on articles_metadata
  for update using (auth.uid() = (select user_id from projects where id = articles_metadata.project_id));

create policy "Users can delete their own articles metadata" on articles_metadata
  for delete using (auth.uid() = (select user_id from projects where id = articles_metadata.project_id));

-- Index for faster queries
create index articles_metadata_project_id_idx on articles_metadata(project_id);
create index articles_metadata_focus_keyword_idx on articles_metadata(focus_keyword);
