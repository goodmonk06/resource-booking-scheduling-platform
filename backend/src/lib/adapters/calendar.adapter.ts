/**
 * Calendar sync adapter interface
 * Allows integration with Google Calendar, Outlook, Apple Calendar, etc.
 */

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  metadata?: Record<string, any>;
}

export interface ICalendarAdapter {
  /**
   * Provider name (e.g., "google", "outlook")
   */
  getName(): string;

  /**
   * Create a calendar event
   */
  createEvent(event: CalendarEvent): Promise<{ eventId: string }>;

  /**
   * Update a calendar event
   */
  updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void>;

  /**
   * Delete a calendar event
   */
  deleteEvent(eventId: string): Promise<void>;

  /**
   * Get events in a time range
   */
  getEvents(startTime: Date, endTime: Date): Promise<CalendarEvent[]>;
}

/**
 * Stub calendar adapter (returns success without actual sync)
 */
export class StubCalendarAdapter implements ICalendarAdapter {
  constructor(private providerName: string = 'stub') {}

  getName(): string {
    return this.providerName;
  }

  async createEvent(event: CalendarEvent): Promise<{ eventId: string }> {
    console.log(`[${this.providerName}] Creating calendar event:`, event.title);
    return { eventId: `${this.providerName}_${Date.now()}` };
  }

  async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>,
  ): Promise<void> {
    console.log(`[${this.providerName}] Updating event ${eventId}`);
  }

  async deleteEvent(eventId: string): Promise<void> {
    console.log(`[${this.providerName}] Deleting event ${eventId}`);
  }

  async getEvents(startTime: Date, endTime: Date): Promise<CalendarEvent[]> {
    console.log(
      `[${this.providerName}] Fetching events from ${startTime} to ${endTime}`,
    );
    return [];
  }
}
