/**
 * Deskera CRM Schema Alignment
 * This schema formally maps Ground Game's internal lead status, rep notes,
 * and geospatial data to the standardized contact and organization fields
 * utilized by Deskera.
 *
 * The AXiM Core consumes this schema via the Universal Dispatcher webhook
 * and securely maps it to Albato/Deskera.
 */

export interface DeskeraContact {
  // Personal Info
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;

  // Contact Address mapped from Ground Game Lead
  address: {
    street: string;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string; // Defaults to "US"
  };

  // Custom Fields (used for Ground Game geospatial data and field notes)
  custom_fields: {
    ground_game_lead_id: string; // The original Ground Game UUID
    latitude: number | null;
    longitude: number | null;
    last_interaction_outcome: string; // e.g., "Interested", "Not Home", "Completed"
    field_notes: string | null;
    assigned_rep_id?: string;
  };
}

export interface DeskeraOrganization {
  name: string; // Map to the AXiM Organization name or "Residential" for B2C
}

export interface DeskeraUniversalPayload {
  organization?: DeskeraOrganization;
  contact: DeskeraContact;
  event_timestamp: string; // ISO 8601 string
  trigger_event: 'lead_converted' | 'lead_updated';
}

/**
 * Example mapping function (conceptual)
 * Given the AXiM webhook payload (Lead and Interaction data),
 * construct the Deskera CRM expected payload.
 */
export const mapToDeskera = (leadData: any, interactionData: any): DeskeraUniversalPayload => {
  return {
    contact: {
      first_name: leadData.firstName || null,
      last_name: leadData.lastName || null,
      email: leadData.email || null,
      phone_number: leadData.phone || null,
      address: {
        street: leadData.streetAddress,
        city: leadData.city || null,
        state: leadData.state || null,
        zip_code: leadData.zip || null,
        country: 'US'
      },
      custom_fields: {
        ground_game_lead_id: leadData.id,
        latitude: leadData.location?.coordinates?.[1] || null,
        longitude: leadData.location?.coordinates?.[0] || null,
        last_interaction_outcome: interactionData.outcome,
        field_notes: interactionData.notes || leadData.notes || null
      }
    },
    event_timestamp: new Date().toISOString(),
    trigger_event: 'lead_converted'
  };
};
