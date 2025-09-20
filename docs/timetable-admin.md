# Timetable Admin Guide

This guide explains how to configure and manage the timetable with constraints, generate schedules, and interpret the grid overlays.

## Concepts

- Sections and Subjects: A timetable entry assigns a `subject` taught to a `section` by a `teacher` in an optional `room`.
- Requirements: Weekly teaching goals per section/subject: `periodsPerWeek`, `durationMinutes`, optional `allowDouble`, `minGapMins`, and `preferredRoomType`.
- Unavailability: Time ranges when teachers or rooms are unavailable.
- Pinned Slots: Fixed lessons the generator must honor (e.g., Assembly Monday 08:00–08:30).

## Manage Data

Open Academics → Timetable (School Admin role).

- Subject Requirements:
  - Click `Manage Subject Requirements`.
  - Filter by section, add/edit required periods, durations, and options.
- Staff Unavailability:
  - Click `Manage Staff Unavailability`.
  - Filter by teacher. Add/edit a day + time range and note.
- Room Unavailability:
  - Click `Manage Room Unavailability`.
  - Filter by room. Add/edit a day + time range and note.
- Pinned Slots:
  - Click `Manage Pinned Slots`.
  - Filter by section/teacher. Add/edit a fixed slot (subject, optional teacher/room, day/time, note).

## Generate Timetable

- Click `Generate Timetable` and set options:
  - `Include Pinned Slots`: The generator will place pinned entries directly in the timetable.
  - `Honor Unavailability`: Avoid suggestions/placements in blocked times.
  - `Preferred Start/End`: Soft window for placement.
  - `Target Sections`: Limit generation to selected sections.
- Click `Run Generation`.

## Suggest Best Slot

- Click `Suggest Best Slot`.
- Provide section, subject, teacher, optional day, duration, and preferred room.
- A suggestion is returned; click `Use this slot` to pre-fill the Add dialog.

## Grid Views

- Grid View: Days as columns and 30-minute rows. Drag-and-drop to move entries (admin only). Edit/Delete via hover buttons.
- List View: A simple table of timetable entries with actions.

## Overlays (Visual Aids)

Overlay colors help you see constraints and pins at a glance:

- Amber: Pinned slots.
- Red: Staff unavailable (when a teacher filter is applied).
- Purple: Room unavailable (when a room filter is applied).

Use the overlay toggles above the grid to show/hide each layer.

Notes:

- Overlays are based on current filters to keep performance snappy.
- Generation and conflict checks still enforce constraints regardless of overlay visibility.

## Conflict Handling

- When creating/updating an entry, if a conflict is detected, a dialog will offer an `Override` option.
- Overriding deletes conflicting entries; use with caution.

## Tips

- Fill Requirements first; they guide the generator.
- Use Pinned Slots for fixed events (assemblies, lab bookings).
- Record unavailability regularly to keep suggestions/generation realistic.

## Troubleshooting

- If dropdowns are empty, ensure academic data (sections/subjects/teachers/rooms) exists.
- If generation places fewer sessions than expected, check requirements and staff/room availability.
- Use the list view to quickly inspect entries across the week.
