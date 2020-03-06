-- Database: cassiopeia

-- DROP DATABASE cassiopeia;

CREATE DATABASE cassiopeia
    WITH 
    OWNER = cassiopeia
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE cassiopeia
    IS 'Database for API Cassiopeia';