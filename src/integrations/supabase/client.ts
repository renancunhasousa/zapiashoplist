
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kmtaoioybvgmhpytqito.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGFvaW95YnZnbWhweXRxaXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwNTgzMjgsImV4cCI6MjA1NjYzNDMyOH0.k9qpLIRKZBgcI_h7Szer9O03r-Vg3HIsmWv-ngXd-BI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);
