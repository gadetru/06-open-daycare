# Family Panel Specification

## Purpose

Da a cada familia un panel propio de solo lectura donde ve las novedades etiquetadas a su hijo o hija y los anuncios generales de su guardería, sin acceder a datos de otros niños ni a funciones del personal.

## Requirements

### Requirement: Family feed shows tagged posts and general announcements

The system SHALL show a parent, in `/familia`, the posts tagged to their linked children (via `post_children` + `parent_children`) plus general announcements of their daycare, ordered from newest to oldest and grouped by day. A general announcement is a post with `type = 'announcement'` AND `room_id IS NULL` authored by staff of the parent's daycare. Room-wide posts ("toda la sala") and posts tagged to other children SHALL NOT appear.

#### Scenario: Parent sees their child's posts

- **WHEN** a parent with a linked child opens `/familia`
- **THEN** the feed lists every post tagged to that child plus general announcements, newest first, grouped by day

#### Scenario: Parent does not see other children's posts

- **WHEN** a post is tagged only to a child not linked to the parent (or targets a whole room)
- **THEN** that post does not appear in the parent's feed

#### Scenario: Parent with several children sees the union

- **WHEN** a parent is linked to more than one child
- **THEN** the feed contains the tagged posts of all their children plus general announcements, ordered by publication date

### Requirement: Family panel is read-only

The system SHALL NOT offer post creation, child management, parent invitations, or access to `/kids` routes in the family panel. There is no publish input, no modal, and no write action reachable from `/familia`.

#### Scenario: No creation UI in family panel

- **WHEN** a parent opens `/familia`
- **THEN** no publish button, input, or modal is shown and the feed is the only content besides navigation

### Requirement: Family sees reduced child data

The system SHALL show a parent only reduced data about their own children: first name, room name, author name of each post, feed text, and photos. It SHALL NOT expose medical notes, allergy tags, exact birth date, photo consent flags, other children, or invitations.

#### Scenario: Reduced header

- **WHEN** a parent opens `/familia`
- **THEN** the header greets them and names their child or children and the daycare, without medical or sensitive data

### Requirement: Empty state without linked children

The system SHALL show an empty state with a message in `/familia` when the parent has no linked children (e.g. pending activation), instead of redirecting or failing.

#### Scenario: Parent without links

- **WHEN** a parent with no rows in `parent_children` opens `/familia`
- **THEN** they see an empty-state message explaining there is no news yet, and no error is shown
