-- Table: public.update

-- DROP TABLE public.update;

CREATE TABLE public.update
(
    id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    name character varying(100) COLLATE pg_catalog."default",
    status character varying(100) COLLATE pg_catalog."default",
    errors character varying(255) COLLATE pg_catalog."default",
    date date,
    CONSTRAINT update_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.update
    OWNER to cassiopeia;