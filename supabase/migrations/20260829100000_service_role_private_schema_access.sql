-- Allow the trusted backend service role to execute private trigger helpers.
--
-- The private schema remains absent from PostgREST's exposed schemas and the
-- role receives no CREATE privilege. This grant only lets server-side service
-- operations pass the same tenant-integrity triggers used by authenticated
-- application writes.

BEGIN;

GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;

COMMIT;
