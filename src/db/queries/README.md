# Server queries

Future authorized queries and transactions belong here, behind `server-only`.
Call `getDb()` inside the operation, not at module scope. Do not export raw rows,
connection objects or errors containing connection details to client components.

TASK-009 deliberately defines no User, Profile, Trip or other business query.
