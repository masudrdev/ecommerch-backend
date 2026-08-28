-- Abort safely before changing data if two existing values normalize to the same phone.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User"
    WHERE NULLIF(btrim("phone"), '') IS NOT NULL
      AND length(regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g')) NOT BETWEEN 6 AND 15
  ) THEN
    RAISE EXCEPTION 'Cannot normalize User.phone: invalid existing phone values must be corrected first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (
      SELECT CASE
        WHEN digits LIKE '880%' THEN '+' || digits
        WHEN digits ~ '^01[0-9]{9}$' THEN '+88' || digits
        WHEN digits ~ '^1[0-9]{9}$' THEN '+880' || digits
        ELSE '+' || digits
      END AS normalized_phone
      FROM (
        SELECT regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g') AS digits
        FROM "User" WHERE NULLIF(btrim("phone"), '') IS NOT NULL
      ) phones
    ) normalized
    GROUP BY normalized_phone HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique User.phone constraint: duplicate normalized phone numbers exist';
  END IF;
END $$;

UPDATE "User"
SET "phone" = CASE
  WHEN NULLIF(btrim("phone"), '') IS NULL THEN NULL
  WHEN regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g') LIKE '880%' THEN '+' || regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g')
  WHEN regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g') ~ '^01[0-9]{9}$' THEN '+88' || regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g')
  WHEN regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g') ~ '^1[0-9]{9}$' THEN '+880' || regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g')
  ELSE '+' || regexp_replace(regexp_replace("phone", '^00', ''), '[^0-9]', '', 'g')
END
WHERE "phone" IS NOT NULL;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");