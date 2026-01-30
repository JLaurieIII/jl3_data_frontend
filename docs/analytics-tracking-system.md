# JL3 Analytics Tracking System

## Overview

A custom-built, privacy-respecting analytics tracking system for jamesjlaurieiii.com. Captures page views, CTA clicks, outbound links, and UTM attribution without relying on third-party services like Google Analytics.

## Current Status: Phase 1 Complete

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | JavaScript tracking pixel | ✅ Complete |
| Phase 2 | AWS ingestion pipeline (API Gateway → Lambda → Kinesis → S3) | 🔲 Not started |
| Phase 3 | Snowflake + dbt data warehouse | 🔲 Not started |
| Phase 4 | Streamlit dashboard | 🔲 Not started |

## Architecture

```
Phase 1 (Current):
Browser → analytics.js → Console (debug mode)

Phase 2+ (Future):
Browser → analytics.js → API Gateway → Lambda → Kinesis → S3 → Snowflake → Dashboard
```

## Files

| File | Purpose |
|------|---------|
| `public/assets/js/analytics.js` | Main tracking script (~400 lines, heavily documented) |
| `docs/analytics-tracking-system.md` | This documentation |

## What Gets Tracked

### Automatic Tracking
- **Page views**: Every page load
- **Outbound links**: Clicks to external websites (LinkedIn, GitHub, etc.)
- **Session management**: 30-minute timeout, persists across pages

### Manual Tracking (via HTML attributes)
- **CTA clicks**: Buttons marked with `data-analytics="cta"`

## Event Schema

Every tracked event includes:

```json
{
  "event_id": "uuid-v4",
  "event_type": "page_view | cta_click | outbound_link",
  "event_ts": "2026-01-24T20:15:00.000Z",
  "property": "jamesjlaurieiii",

  "session_id": "uuid-v4",
  "page_path": "/case-studies/duffdash.html",
  "page_url": "https://jamesjlaurieiii.com/case-studies/duffdash.html",
  "page_title": "DuffDash Case Study",
  "referrer": "https://linkedin.com/feed",

  "utm_source": "linkedin",
  "utm_medium": "social",
  "utm_campaign": "duffdash_launch",
  "utm_content": null,
  "utm_term": null,

  "screen_width": 1920,
  "screen_height": 1080,
  "viewport_width": 1200,
  "viewport_height": 800,
  "user_agent": "Mozilla/5.0..."
}
```

## How to Add Tracking to a Page

### 1. Include the Script

Add before `</body>`:

```html
<script src="/assets/js/analytics.js"></script>
```

### 2. Mark CTAs (Optional)

Add attributes to important buttons:

```html
<a href="/contact"
   data-analytics="cta"
   data-analytics-id="contact-nav">
  Contact Me
</a>
```

### 3. Test It

1. Open the page in browser
2. Open DevTools (F12) → Console tab
3. Look for `[JL3 Analytics]` messages
4. Type `JL3Analytics.events` to see all tracked events

## Configuration

Edit `analytics.js` to change settings:

```javascript
JL3Analytics.config = {
  endpoint: null,              // API URL (null = console only)
  property: "jamesjlaurieiii", // Site identifier
  debug: true,                 // Show console messages
  sessionTimeoutMinutes: 30,   // Session expiration
  storageKey: "jl3_analytics_session"
};
```

**For production:** Set `debug: false` to hide console messages from visitors.

## UTM Parameter Support

The system automatically captures UTM parameters from URLs:

```
https://jamesjlaurieiii.com/?utm_source=linkedin&utm_campaign=duffdash_launch
```

These are stored in the session and attached to ALL events during that visit.

## Pages Currently Tracking

- [x] `/case-studies/duffdash-saas-mrr-analytics.html`
- [ ] Homepage (add script tag)
- [ ] Other pages (add script tag)

## Privacy Considerations

- No cookies (uses localStorage for session only)
- No personal data collected
- No third-party tracking
- IP addresses not stored (will be hashed in Phase 2)
- User can clear localStorage to reset session

## Next Steps (Phase 2)

1. Create Terraform module for AWS analytics pipeline
2. Deploy API Gateway endpoint
3. Update `analytics.js` endpoint configuration
4. Events will flow: Browser → AWS → S3 → Snowflake

## Cost Estimate

| Phase | Monthly Cost |
|-------|--------------|
| Phase 1 (current) | $0 |
| Phase 2 (AWS pipeline) | ~$20-25 |
| Phase 3 (Snowflake) | ~$2-5 (free trial available) |
| Phase 4 (Streamlit) | $0 (free tier) |

---

*Built January 2026 as a portfolio project demonstrating JavaScript, AWS, and data engineering skills.*
