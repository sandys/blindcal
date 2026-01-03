-- BlindCal Initial Schema
-- This migration creates the core database structure for the Wingman Model

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('wingman', 'single', 'candidate');
CREATE TYPE trust_level AS ENUM ('full_delegation', 'approval_required', 'view_only');
CREATE TYPE pipeline_stage AS ENUM (
  'new',
  'screening',
  'proposed',
  'approved',
  'scheduled',
  'completed',
  'rejected',
  'archived'
);
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);
CREATE TYPE identity_disclosure_level AS ENUM (
  'anonymous',
  'first_name',
  'full_profile',
  'contact_shared'
);
CREATE TYPE event_type AS ENUM (
  -- Booking events
  'booking_requested',
  'booking_confirmed',
  'booking_cancelled',
  'booking_rescheduled',
  'booking_completed',
  'booking_no_show',
  -- Pipeline events
  'candidate_applied',
  'candidate_stage_changed',
  'candidate_approved',
  'candidate_rejected',
  'candidate_archived',
  -- Safety events
  'check_in_requested',
  'check_in_received',
  'check_in_missed',
  'location_shared',
  'emergency_triggered'
);

-- ============================================
-- CORE IDENTITY TABLES
-- ============================================

-- User profiles extending Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,

  -- Role management (users can have multiple roles)
  roles user_role[] DEFAULT ARRAY['wingman']::user_role[],

  -- Settings
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{}',

  -- Safety contacts
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for RLS performance
CREATE INDEX idx_profiles_id ON profiles(id);

-- ============================================
-- WINGMAN-SINGLE RELATIONSHIPS (DELEGATIONS)
-- ============================================

-- Delegation: Single grants Wingman access
CREATE TABLE delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  single_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wingman_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  trust_level trust_level NOT NULL DEFAULT 'approval_required',

  -- Calendar access
  calendar_access_granted BOOLEAN DEFAULT FALSE,
  calendar_provider TEXT,
  calendar_credentials_encrypted TEXT,

  -- Permissions
  can_view_calendar BOOLEAN DEFAULT TRUE,
  can_propose_times BOOLEAN DEFAULT TRUE,
  can_book_directly BOOLEAN DEFAULT FALSE,
  can_message_candidates BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(single_id, wingman_id)
);

CREATE INDEX idx_delegations_wingman ON delegations(wingman_id) WHERE is_active = TRUE;
CREATE INDEX idx_delegations_single ON delegations(single_id) WHERE is_active = TRUE;

-- ============================================
-- CAMPAIGNS
-- ============================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wingman_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  single_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delegation_id UUID NOT NULL REFERENCES delegations(id),

  -- Campaign details
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,

  -- Landing page customization
  template_id TEXT DEFAULT 'default',
  custom_template TEXT,
  custom_css TEXT,
  theme_config JSONB DEFAULT '{}',

  -- Media
  cover_image_url TEXT,
  gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Application settings
  application_questions JSONB DEFAULT '[]',
  requires_photo BOOLEAN DEFAULT FALSE,
  requires_bio BOOLEAN DEFAULT TRUE,
  auto_reject_incomplete BOOLEAN DEFAULT FALSE,

  -- Identity disclosure settings
  initial_disclosure_level identity_disclosure_level DEFAULT 'first_name',

  -- Status
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  is_accepting_applications BOOLEAN DEFAULT TRUE,

  -- Limits
  max_active_candidates INTEGER DEFAULT 50,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_wingman ON campaigns(wingman_id);
CREATE INDEX idx_campaigns_single ON campaigns(single_id);
CREATE INDEX idx_campaigns_slug ON campaigns(slug) WHERE is_published = TRUE;

-- ============================================
-- CANDIDATES / APPLICATIONS
-- ============================================

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Candidate may or may not have an account
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Application data
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Application responses
  application_responses JSONB DEFAULT '{}',

  -- Pipeline state
  current_stage pipeline_stage NOT NULL DEFAULT 'new',
  stage_changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identity disclosure
  disclosure_level identity_disclosure_level DEFAULT 'anonymous',

  -- Masked communication
  masked_email TEXT,

  -- Screening notes (visible to wingman only)
  wingman_notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  proposed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, email)
);

CREATE INDEX idx_candidates_campaign ON candidates(campaign_id);
CREATE INDEX idx_candidates_stage ON candidates(campaign_id, current_stage);
CREATE INDEX idx_candidates_user ON candidates(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- BOOKINGS (Dates/Meetings)
-- ============================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  single_id UUID NOT NULL REFERENCES profiles(id),
  wingman_id UUID NOT NULL REFERENCES profiles(id),

  -- External calendar reference
  external_booking_id TEXT,
  external_event_type_id TEXT,

  -- Booking details
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,

  -- Location
  location_type TEXT,
  location_details JSONB,

  -- Status
  status booking_status NOT NULL DEFAULT 'pending',

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT TRUE,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Confirmation tracking
  single_confirmed BOOLEAN DEFAULT FALSE,
  candidate_confirmed BOOLEAN DEFAULT FALSE,

  -- Safety features
  safety_check_in_enabled BOOLEAN DEFAULT FALSE,
  safety_check_in_interval_minutes INTEGER DEFAULT 60,
  emergency_contact_notified BOOLEAN DEFAULT FALSE,

  -- Feedback
  feedback_requested_at TIMESTAMPTZ,
  feedback_completed_at TIMESTAMPTZ,

  -- Rescheduling
  rescheduled_from UUID REFERENCES bookings(id),
  reschedule_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_campaign ON bookings(campaign_id);
CREATE INDEX idx_bookings_candidate ON bookings(candidate_id);
CREATE INDEX idx_bookings_single ON bookings(single_id);
CREATE INDEX idx_bookings_wingman ON bookings(wingman_id);
CREATE INDEX idx_bookings_status ON bookings(status) WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_time ON bookings(start_time) WHERE status = 'confirmed';

-- ============================================
-- EVENT SOURCING: EVENT STORE
-- ============================================

-- Immutable event log for booking lifecycle
CREATE TABLE booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  event_type event_type NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',

  -- Actor who triggered the event
  actor_id UUID REFERENCES profiles(id),
  actor_role user_role,

  -- Idempotency
  idempotency_key TEXT,

  -- Metadata
  source TEXT,
  correlation_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(booking_id, idempotency_key)
);

CREATE INDEX idx_booking_events_booking ON booking_events(booking_id);
CREATE INDEX idx_booking_events_type ON booking_events(event_type);
CREATE INDEX idx_booking_events_created ON booking_events(created_at);

-- Pipeline events for candidate lifecycle
CREATE TABLE candidate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  event_type event_type NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',

  from_stage pipeline_stage,
  to_stage pipeline_stage,

  actor_id UUID REFERENCES profiles(id),
  actor_role user_role,

  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(candidate_id, idempotency_key)
);

CREATE INDEX idx_candidate_events_candidate ON candidate_events(candidate_id);

-- ============================================
-- TRANSACTIONAL OUTBOX
-- ============================================

CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,

  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,

  -- Processing state
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simple index for unprocessed outbox items (NOW() check done at query time)
CREATE INDEX idx_outbox_unprocessed ON outbox(created_at)
  WHERE processed_at IS NULL;

-- ============================================
-- MASKED MESSAGING
-- ============================================

CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- The other party (single or wingman)
  other_participant_id UUID NOT NULL REFERENCES profiles(id),
  other_participant_role user_role NOT NULL,

  -- Masked identities
  candidate_alias TEXT NOT NULL,
  other_alias TEXT NOT NULL,

  -- Masked email addresses
  candidate_masked_email TEXT NOT NULL,
  other_masked_email TEXT NOT NULL,

  -- Thread state
  is_active BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_candidate ON message_threads(candidate_id);
CREATE INDEX idx_threads_campaign ON message_threads(campaign_id);
CREATE INDEX idx_threads_participant ON message_threads(other_participant_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,

  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_role user_role NOT NULL,

  content TEXT NOT NULL,

  -- Email relay tracking
  external_message_id TEXT,
  is_inbound BOOLEAN DEFAULT FALSE,

  -- Read tracking
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_created ON messages(thread_id, created_at);

-- ============================================
-- SAFETY FEATURES
-- ============================================

CREATE TABLE safety_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Check-in request
  requested_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,

  -- Response
  responded_at TIMESTAMPTZ,
  status TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_accuracy_meters INTEGER,

  -- Escalation
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  emergency_contact_notified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_check_ins_booking ON safety_check_ins(booking_id);
CREATE INDEX idx_check_ins_due ON safety_check_ins(due_at) WHERE responded_at IS NULL;

-- ============================================
-- FEEDBACK
-- ============================================

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  from_user_id UUID NOT NULL REFERENCES profiles(id),
  from_role user_role NOT NULL,

  -- Ratings
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  chemistry_rating INTEGER CHECK (chemistry_rating >= 1 AND chemistry_rating <= 5),

  -- Qualitative
  would_meet_again BOOLEAN,
  highlights TEXT,
  improvements TEXT,
  private_notes TEXT,

  -- Safety reporting
  safety_concerns BOOLEAN DEFAULT FALSE,
  safety_details TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_booking ON feedback(booking_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER delegations_updated_at
  BEFORE UPDATE ON delegations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to record booking events
CREATE OR REPLACE FUNCTION record_booking_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_events (booking_id, event_type, event_data, source)
  VALUES (
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'booking_requested'::event_type
      WHEN OLD.status != NEW.status THEN
        CASE NEW.status
          WHEN 'confirmed' THEN 'booking_confirmed'::event_type
          WHEN 'cancelled' THEN 'booking_cancelled'::event_type
          WHEN 'completed' THEN 'booking_completed'::event_type
          WHEN 'no_show' THEN 'booking_no_show'::event_type
          ELSE 'booking_requested'::event_type
        END
      ELSE 'booking_requested'::event_type
    END,
    jsonb_build_object(
      'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      'new_status', NEW.status,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time
    ),
    'trigger'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_event_trigger
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION record_booking_event();

-- Function to record candidate stage changes
CREATE OR REPLACE FUNCTION record_candidate_stage_change()
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

    -- Update stage_changed_at
    NEW.stage_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidate_stage_trigger
  BEFORE INSERT OR UPDATE OF current_stage ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION record_candidate_stage_change();

-- Function to add events to outbox
CREATE OR REPLACE FUNCTION add_to_outbox()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
  VALUES (
    TG_ARGV[0],
    NEW.id,
    TG_ARGV[1],
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Outbox triggers for key events
CREATE TRIGGER booking_created_outbox
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION add_to_outbox('booking', 'created');

CREATE TRIGGER booking_status_outbox
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION add_to_outbox('booking', 'status_changed');

CREATE TRIGGER candidate_stage_outbox
  AFTER UPDATE OF current_stage ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION add_to_outbox('candidate', 'stage_changed');

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Delegation policies
CREATE POLICY "Users can view delegations they're part of"
  ON delegations FOR SELECT
  USING (auth.uid() = single_id OR auth.uid() = wingman_id);

CREATE POLICY "Singles can create delegations"
  ON delegations FOR INSERT
  WITH CHECK (auth.uid() = single_id);

CREATE POLICY "Singles can update their delegations"
  ON delegations FOR UPDATE
  USING (auth.uid() = single_id);

CREATE POLICY "Singles can delete their delegations"
  ON delegations FOR DELETE
  USING (auth.uid() = single_id);

-- Campaign policies
CREATE POLICY "Campaign participants can view"
  ON campaigns FOR SELECT
  USING (
    auth.uid() = wingman_id
    OR auth.uid() = single_id
    OR (is_published = TRUE)
  );

CREATE POLICY "Wingman can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = wingman_id);

CREATE POLICY "Wingman can update campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = wingman_id);

CREATE POLICY "Wingman can delete campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = wingman_id);

-- Candidate policies
CREATE POLICY "Authorized users can view candidates"
  ON candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id
      AND (c.wingman_id = auth.uid() OR c.single_id = auth.uid())
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Anyone can apply to published campaigns"
  ON candidates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id
      AND c.is_published = TRUE
      AND c.is_accepting_applications = TRUE
    )
  );

CREATE POLICY "Wingman can update candidates"
  ON candidates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id
      AND c.wingman_id = auth.uid()
    )
  );

-- Booking policies
CREATE POLICY "Booking participants can view"
  ON bookings FOR SELECT
  USING (
    single_id = auth.uid()
    OR wingman_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM candidates c
      WHERE c.id = candidate_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Wingman can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (wingman_id = auth.uid());

CREATE POLICY "Booking participants can update"
  ON bookings FOR UPDATE
  USING (
    single_id = auth.uid()
    OR wingman_id = auth.uid()
  );

-- Booking events (read-only for participants)
CREATE POLICY "Booking event participants can view"
  ON booking_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
      AND (b.single_id = auth.uid() OR b.wingman_id = auth.uid())
    )
  );

-- Candidate events (read-only for campaign owners)
CREATE POLICY "Campaign owners can view candidate events"
  ON candidate_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM candidates c
      JOIN campaigns ca ON c.campaign_id = ca.id
      WHERE c.id = candidate_id
      AND (ca.wingman_id = auth.uid() OR ca.single_id = auth.uid())
    )
  );

-- Message thread policies
CREATE POLICY "Thread participants can view"
  ON message_threads FOR SELECT
  USING (
    other_participant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM candidates c
      WHERE c.id = candidate_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can create threads"
  ON message_threads FOR INSERT
  WITH CHECK (
    other_participant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id
      AND (c.wingman_id = auth.uid() OR c.single_id = auth.uid())
    )
  );

-- Message policies
CREATE POLICY "Thread participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id
      AND (
        t.other_participant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM candidates c
          WHERE c.id = t.candidate_id AND c.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Thread participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id
      AND (
        t.other_participant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM candidates c
          WHERE c.id = t.candidate_id AND c.user_id = auth.uid()
        )
      )
    )
  );

-- Safety check-in policies
CREATE POLICY "Check-in participants can view"
  ON safety_check_ins FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
      AND b.wingman_id = auth.uid()
    )
  );

CREATE POLICY "Users can respond to their check-ins"
  ON safety_check_ins FOR UPDATE
  USING (user_id = auth.uid());

-- Feedback policies
CREATE POLICY "Feedback participants can view"
  ON feedback FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
      AND b.wingman_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their feedback"
  ON feedback FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

-- Outbox policies (service role only - no user access)
CREATE POLICY "No user access to outbox"
  ON outbox FOR ALL
  USING (FALSE);

-- ============================================
-- REALTIME PUBLICATIONS
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE safety_check_ins;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
