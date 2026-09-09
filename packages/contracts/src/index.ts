export type AnalyticsEventName = "page_view" | "section_view" | "navigation_click" | "contact_click" | "project_click";

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  occurredAt: string;
  route: string;
  targetId?: string;
}
