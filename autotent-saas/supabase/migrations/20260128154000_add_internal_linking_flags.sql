-- Add internal linking flags to jobs table
alter table jobs 
add column if not exists include_internal_links boolean default false,
add column if not exists internal_link_density text default 'medium' check (internal_link_density in ('low', 'medium', 'high'));

comment on column jobs.include_internal_links is 'Whether to automatically inject internal links to other articles';
comment on column jobs.internal_link_density is 'Density of internal links: low (2-3), medium (3-5), high (5-7)';
