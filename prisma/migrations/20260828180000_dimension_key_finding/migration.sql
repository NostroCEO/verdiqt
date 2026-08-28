-- The concrete highlighted result per dimension (competitor names found,
-- the willingness-to-pay signal, ...), additive and nullable so existing
-- rows and RESCORE runs need no backfill.
ALTER TABLE "DimensionScore" ADD COLUMN "keyFinding" TEXT;
