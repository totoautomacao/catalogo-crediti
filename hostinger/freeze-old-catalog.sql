-- Apply only at cutover, after comparing the final exported snapshot.
-- This blocks obsolete clients from creating a second, divergent catalog.
CREATE SCHEMA IF NOT EXISTS catalogo_migration;
REVOKE ALL ON SCHEMA catalogo_migration FROM PUBLIC;
CREATE OR REPLACE FUNCTION catalogo_migration.hostinger_only()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $$ BEGIN
 RAISE EXCEPTION USING ERRCODE='P0001',
 MESSAGE='O catálogo mudou. Abra https://catalogo.creditisolucoes.com.br/admin para cadastrar ou editar.';
END $$;
REVOKE ALL ON FUNCTION catalogo_migration.hostinger_only() FROM PUBLIC;
CREATE TRIGGER catalogo_hostinger_only BEFORE INSERT OR UPDATE OR DELETE
ON public.veiculos FOR EACH STATEMENT EXECUTE FUNCTION catalogo_migration.hostinger_only();
CREATE TRIGGER catalogo_hostinger_only BEFORE INSERT OR UPDATE OR DELETE
ON public.fotos_veiculo FOR EACH STATEMENT EXECUTE FUNCTION catalogo_migration.hostinger_only();

-- Rollback, only after bringing newer Hostinger changes back into Supabase:
-- DROP TRIGGER catalogo_hostinger_only ON public.veiculos;
-- DROP TRIGGER catalogo_hostinger_only ON public.fotos_veiculo;
