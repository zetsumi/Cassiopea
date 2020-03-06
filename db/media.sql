-- Table: public.media

-- DROP TABLE public.media;

CREATE TABLE public.media
(
    id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    type character varying(255) COLLATE pg_catalog."default",
    name character varying(255) COLLATE pg_catalog."default",
    CONSTRAINT media_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.media
    OWNER to cassiopeia;