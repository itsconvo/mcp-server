# Convo MCP Server

Access your [Convo](https://www.itsconvo.com) meetings from any AI assistant that supports MCP (Claude, ChatGPT, Cursor, and more). Not just a data wrapper. Cross-meeting intelligence that helps you prepare, follow up, and stay on top of everything.

## What you can do

**Single meeting:**
- Read transcripts with speaker names and timestamps
- Get summaries with key points, decisions, and action items
- Get coaching feedback with communication scores
- Ask any question about a meeting
- Draft follow-up emails that reference actual discussion points

**Across meetings:**
- Prepare for an upcoming meeting by reviewing all past interactions with a person or company
- Get a weekly digest of all meetings, decisions, and action items
- Find all open action items across your meetings, filtered by owner or priority

**Built-in workflows:**
- Meeting Prep prompt: one-click briefing before any call
- Weekly Review prompt: consolidated week summary
- Follow-up Blitz prompt: draft follow-up emails for all recent meetings at once

## Setup

### 1. Get your API key

Go to your [Convo dashboard settings](https://www.itsconvo.com) and create an API key. You need a Starter plan or above.

### 2. Install

```bash
npm install -g @itsconvo/mcp-server
```

### 3. Configure your AI assistant

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "convo": {
      "command": "convo-mcp",
      "env": {
        "CONVO_API_KEY": "convo_your_api_key_here"
      }
    }
  }
}
```

#### Claude Code

```bash
claude mcp add convo convo-mcp -e CONVO_API_KEY=convo_your_api_key_here
```

#### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "convo": {
      "command": "convo-mcp",
      "env": {
        "CONVO_API_KEY": "convo_your_api_key_here"
      }
    }
  }
}
```

## Tools

### Core

| Tool | Description |
|------|-------------|
| `list_meetings` | List and search your meetings |
| `get_transcript` | Get full meeting transcript |
| `get_summary` | Get key points, decisions, action items |
| `get_feedback` | Get coaching feedback and scores |
| `ask_about_meeting` | Ask any question about a meeting |
| `draft_followup_email` | Generate a follow-up email |
| `share_meeting` | Create a shareable meeting link |
| `get_upcoming_meetings` | View upcoming calendar events |
| `get_account_info` | Check your plan and API usage |

### Cross-Meeting Intelligence

| Tool | Description |
|------|-------------|
| `prepare_for_meeting` | Get a briefing from all past meetings with a person or company |
| `weekly_digest` | Consolidated digest of all meetings over a time period |
| `find_action_items` | Find all action items across meetings, filter by owner |

### Prompts

| Prompt | Description |
|--------|-------------|
| `meeting-prep` | Pre-built workflow to prepare for a meeting |
| `weekly-review` | Pre-built workflow for your weekly meeting review |
| `follow-up-blitz` | Draft follow-up emails for all recent meetings |

## Example prompts

- "Prepare me for my meeting with Sarah tomorrow"
- "What action items am I behind on?"
- "Give me a digest of all my meetings this week"
- "Draft follow-up emails for all my calls from the last 3 days"
- "What have we discussed with Acme Corp over the last month?"
- "How was my communication in today's client call?"
- "What did we decide about pricing across all recent meetings?"

## Requirements

- Convo account with Starter plan or above
- API key from your Convo dashboard
- Node.js 18+

## Links

- [Convo](https://www.itsconvo.com)
- [API Documentation](https://docs.itsconvo.com)
- [OpenAPI Spec](https://docs.itsconvo.com/openapi.json)
