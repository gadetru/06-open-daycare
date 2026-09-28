# Spec Delta

## Purpose

Aísla el acceso por rol en toda la app para que el personal gestione la guardería y cada familia solo lea lo de sus hijos, cerrando la fuga actual que expone todos los niños del daycare a cualquier padre autenticado.

## ADDED Requirements

### Requirement: Role-based route guards

The system SHALL redirect a `parent` visiting `/`, `/kids`, or `/kids/[id]` to `/familia`, and a `staff` visiting `/familia` to `/`. Unauthenticated visitors keep the current behavior (redirect to `/login`).

#### Scenario: Parent visits staff routes

- **WHEN** an authenticated parent navigates to `/` or any `/kids*` path
- **THEN** they are redirected to `/familia`

#### Scenario: Staff visits family route

- **WHEN** an authenticated staff member navigates to `/familia`
- **THEN** they are redirected to `/`

### Requirement: Login destination depends on role

The system SHALL send the user to `/` after login when their role is `staff` and to `/familia` when their role is `parent`.

#### Scenario: Staff login

- **WHEN** a staff user signs in with valid credentials
- **THEN** they land on `/`

#### Scenario: Parent login

- **WHEN** a parent user signs in with valid credentials
- **THEN** they land on `/familia`

### Requirement: Parents can read their children's posts

The system SHALL allow a parent to SELECT in `posts` only rows that are tagged to their linked children (via `post_children` joined to their own `parent_children` rows) or general announcements (`type = 'announcement'` AND `room_id IS NULL`) authored by staff of their daycare. The same visibility rule SHALL apply to `post_children`, `post_photos`, and `storage.objects` in the `post-photos` bucket so signed photo URLs work for visible posts only.

#### Scenario: Parent reads tagged post with photo

- **WHEN** a parent queries a post tagged to their child that has a photo
- **THEN** the post, its `post_children` link, its `post_photos` row, and the signed URL are all readable

#### Scenario: Parent cannot read other posts

- **WHEN** a parent queries a post tagged to another child or a room-wide post
- **THEN** the query returns no rows

### Requirement: Children list is scoped by role

The system SHALL allow `staff` to SELECT children of their daycare (current behavior) and allow a `parent` to SELECT only children linked to them via `parent_children`. A parent querying another child by id SHALL get no rows. Staff INSERT/UPDATE/DELETE behavior is unchanged.

#### Scenario: Parent cannot enumerate children

- **WHEN** a parent queries the `children` table or a child id that is not theirs
- **THEN** only their linked children (or nothing) is returned

### Requirement: Parents can read author names

The system SHALL allow a parent to read the display name (`full_name`, `avatar_url`) of staff authors of their daycare so the family feed can show "publicado por". No other `users` columns are exposed beyond what parents already read about themselves.

#### Scenario: Author name in family feed

- **WHEN** a parent loads a visible post
- **THEN** the author display name resolves instead of showing blank or failing

### Requirement: Staff behavior is unchanged

The system SHALL keep staff capabilities exactly as today: full feed, publish with photo, kids management, invitations, and existing RLS policies untouched. New parent policies SHALL NOT widen staff access nor grant anything to `anon`.

#### Scenario: Staff regression

- **WHEN** a staff member uses the feed, publishes, or manages kids after this change
- **THEN** everything works as before with no visible difference except the route guards
