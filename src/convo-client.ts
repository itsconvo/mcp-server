const BASE_URL = "https://www.itsconvo.com/api/v1";

function validateId(id: string): string {
  if (!id || /[\/\\\.%]/.test(id)) {
    throw new Error("Invalid meeting ID");
  }
  return encodeURIComponent(id);
}

export class ConvoClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || `API error ${res.status}`;
      throw new Error(msg);
    }

    return res.json();
  }

  async listConversations(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    since?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.search) qs.set("search", params.search);
    if (params?.since) qs.set("since", params.since);
    const query = qs.toString();
    return this.request(`/conversations${query ? `?${query}` : ""}`);
  }

  async getTranscript(id: string) {
    return this.request(`/conversations/${validateId(id)}/transcript`);
  }

  async getKeypoints(id: string) {
    return this.request(`/conversations/${validateId(id)}/keypoints`);
  }

  async generateKeypoints(id: string, forceRefresh = false) {
    return this.request(`/conversations/${validateId(id)}/keypoints`, {
      method: "POST",
      body: JSON.stringify({ forceRefresh }),
    });
  }

  async getFeedback(id: string) {
    return this.request(`/conversations/${validateId(id)}/feedback`);
  }

  async generateFeedback(id: string) {
    return this.request(`/conversations/${validateId(id)}/feedback`, {
      method: "POST",
    });
  }

  async queryConversation(id: string, query: string) {
    return this.request(`/conversations/${validateId(id)}/query`, {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  async generateEmail(
    id: string,
    params?: { recipientName?: string; tone?: string }
  ) {
    return this.request(`/conversations/${validateId(id)}/email`, {
      method: "POST",
      body: JSON.stringify(params || {}),
    });
  }

  async shareConversation(id: string) {
    return this.request(`/conversations/${validateId(id)}/share`, {
      method: "POST",
    });
  }

  async getCalendarEvents(params?: {
    maxResults?: number;
    timeMin?: string;
    timeMax?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.maxResults) qs.set("maxResults", String(params.maxResults));
    if (params?.timeMin) qs.set("timeMin", params.timeMin);
    if (params?.timeMax) qs.set("timeMax", params.timeMax);
    const query = qs.toString();
    return this.request(`/calendar/events${query ? `?${query}` : ""}`);
  }

  async getProfile() {
    return this.request("/user/profile");
  }
}
