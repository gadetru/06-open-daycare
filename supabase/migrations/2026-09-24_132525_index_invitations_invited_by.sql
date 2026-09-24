-- SPEC 12 QA: cubre el FK invited_by en invitations (advisors: unindexed_foreign_keys)

create index invitations_invited_by_idx on public.invitations (invited_by);