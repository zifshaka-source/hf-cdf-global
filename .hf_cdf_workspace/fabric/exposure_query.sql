-- Query live relational operational tables inside SQLite Data Fabric
SELECT
  s.name AS service_name,
  s.version,
  s.status,
  s.access_policy,
  (SELECT COUNT(*) FROM os_event_bus e WHERE e.service = s.name) AS emitted_events
FROM os_services s
ORDER BY emitted_events DESC, s.name ASC;
