-- seed.sql: inserts ten made-up starting records, but ONLY when the table is empty,
-- so running it again will not create duplicates.
INSERT INTO records (title, category, description, status)
SELECT v.title, v.category, v.description, v.status
FROM (VALUES
  ('Broken classroom light',        'Electrical', 'The light in Room B12 does not switch on.', 'Pending'),
  ('Leaking tap in ablution block', 'Plumbing',   'The second tap in the male ablution block near Hostel A drips all day.', 'In progress'),
  ('Broken lecture hall chairs',    'Furniture',  'Three chairs in Lecture Hall 2 have loose backs and are unsafe to sit on.', 'Pending'),
  ('Blocked toilet in library',     'Plumbing',   'The toilet on the ground floor of the library is blocked and overflowing.', 'Completed'),
  ('Flickering corridor lights',    'Electrical', 'Lights in the Engineering block corridor flicker and buzz in the evening.', 'In progress'),
  ('Cracked window pane',           'Building',   'A window in Room A4 is cracked and may fall out during strong wind.', 'Pending'),
  ('Wobbly desk in computer lab',   'Furniture',  'Desk 14 in Computer Lab 1 wobbles and the drawer will not close.', 'Completed'),
  ('No water in hostel showers',    'Plumbing',   'Showers on the first floor of Hostel B have had no water since Monday.', 'In progress'),
  ('Dead socket in staff office',   'Electrical', 'The wall socket next to the printer in Office 7 gives no power.', 'Pending'),
  ('Door lock jammed',              'Building',   'The key breaks in the lock of the Seminar Room 3 door.', 'Completed')
) AS v(title, category, description, status)
WHERE NOT EXISTS (SELECT 1 FROM records);
