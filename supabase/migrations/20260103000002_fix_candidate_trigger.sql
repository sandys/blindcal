-- Fix candidate stage trigger: split into BEFORE (for timestamps) and AFTER (for events)
-- The original trigger was BEFORE INSERT which couldn't insert into candidate_events
-- due to foreign key constraint (candidate doesn't exist yet)

-- Drop the original trigger
DROP TRIGGER IF EXISTS candidate_stage_trigger ON candidates;
DROP FUNCTION IF EXISTS record_candidate_stage_change();

-- Create BEFORE trigger just for updating stage_changed_at
CREATE OR REPLACE FUNCTION update_candidate_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.current_stage != NEW.current_stage THEN
    NEW.stage_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidate_stage_timestamp_trigger
  BEFORE INSERT OR UPDATE OF current_stage ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_stage_timestamp();

-- Create AFTER trigger for recording events
CREATE OR REPLACE FUNCTION record_candidate_stage_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.current_stage != NEW.current_stage THEN
    INSERT INTO candidate_events (
      candidate_id,
      event_type,
      from_stage,
      to_stage,
      event_data
    )
    VALUES (
      NEW.id,
      'candidate_stage_changed'::event_type,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.current_stage ELSE NULL END,
      NEW.current_stage,
      jsonb_build_object(
        'timestamp', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidate_stage_event_trigger
  AFTER INSERT OR UPDATE OF current_stage ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION record_candidate_stage_event();
