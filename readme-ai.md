You are a senior front-end engineer + SEO-minded marketer. Build a production-ready, static business website for a solo consultant offering: (1) Data Engineering & Migrations, (2) Automation & Integrations, (3) Data Extraction & Feeds. The goal is lead generation and SEO traffic. Build clean, fast, accessible pages with clear calls-to-action.

CONTEXT
- The website is for a solo operator (me) who sells services to companies hiring on Upwork-like marketplaces.
- I already own the domain: [YOURDOMAIN.com]
- Host on AWS as a static site: S3 + CloudFront + Route53 + HTTPS (ACM).
- You will output a repo that I can deploy with a single script (aws cli).
- I will provide an existing “README-AI” file with additional instructions; your work must align with it. If there is conflict, prefer README-AI instructions.

PRIMARY GOALS
1) Conversion: book call + contact form submission.
2) SEO: rank for high-intent keywords related to:
   - Databricks Snowflake migration / Spark pipeline
   - data engineering consulting
   - ETL/ELT pipeline build
   - CRM automation Zapier n8n
   - HubSpot operations hub custom code / dedupe
   - web scraping / incremental data feeds / crawlers
   - document automation / LLM document pipelines (secondary)
3) Credibility: show process, deliverables, examples, “why trust me”.

NON-GOALS
- No heavy backend. Static-first. Light JS only.
- No frameworks required unless explicitly needed. Prefer vanilla HTML/CSS/JS.
- No scraping of Upwork or restricted sites. Copy should not imply scraping Upwork.

BRAND + STYLE
- Tone: confident, crisp, practical. No buzzword fluff.
- Visual: modern, minimal, “engineering-grade”. Lots of whitespace. Strong typography.
- Mobile-first. Lighthouse 90+.
- Use a consistent design system: colors, spacing scale, type scale, button styles, card styles.

SITE MAP (PAGES REQUIRED)
1) /index.html (Home)
2) /services/index.html (Services overview)
3) /services/data-engineering.html (Data Engineering & Migrations)
4) /services/automation.html (Automation & Integrations)
5) /services/data-feeds.html (Data Extraction & Incremental Feeds)
6) /case-studies/index.html (Case Studies)
7) /about.html (About)
8) /contact.html (Contact)
9) /resources/index.html (SEO blog hub page; can start with 6 “topic stub” articles)
10) /resources/[slug].html (Create at least 6 starter articles; see SEO section)
11) /privacy.html (Privacy policy)
12) /404.html

GLOBAL COMPONENTS
- Top nav with logo text: “[BUSINESS NAME]” (placeholder)
- Nav links: Services, Case Studies, Resources, About, Contact
- Sticky CTA button in nav: “Book a Call”
- Footer: links, short value prop, location: “US-based”, email placeholder, social placeholders

CTAs (EVERY PAGE)
- Primary CTA: “Book a 15-min call” -> [CALENDLY LINK PLACEHOLDER]
- Secondary CTA: “Describe your project” -> /contact.html
- Contact page includes form + alternative direct email link.

CONTACT FORM REQUIREMENTS (STATIC-FRIENDLY)
Implement the form in a way that works for static hosting. Provide TWO options:
Option A (default): Formspree (or similar) with placeholder endpoint.
Option B (AWS-native): API Gateway + Lambda + SES (just provide a documented placeholder; do not build infra here unless easy).
Form fields:
- name
- email
- company
- project_type (dropdown: Data Engineering, Automation, Data Feeds, Other)
- budget_range (dropdown)
- timeline (dropdown)
- description (textarea)
- checkbox: “I’m OK with you emailing me about this request.”
Add spam protection:
- honeypot field
- basic client-side validation
No heavy dependencies.

COPY REQUIREMENTS (WRITE THE COPY IN THE SITE)
Write clear, specific copy that speaks to real buyer pain:
- “We have data everywhere and don’t trust it.”
- “Pipelines are brittle.”
- “We need integration without duct tape.”
- “We need incremental updates + monitoring.”
Use outcome language, not tools-only.
Still mention tools for credibility: Databricks, Spark, Delta Lake, Snowflake, BigQuery, Postgres, dbt, Airflow/ADF, Python, SQL, Zapier, n8n, HubSpot Ops Hub, Make (optional), AWS/Azure.

HOME PAGE CONTENT STRUCTURE
Above the fold:
- Headline: “Data engineering & automation that actually runs.”
- Subhead: “Migrations, pipelines, integrations, and data feeds with validation, monitoring, and handoff documentation.”
- 2 CTAs (Book call + Contact)
Below:
- “What I do” 3 service cards (Data Engineering / Automation / Data Feeds) with bullet deliverables + typical timelines
- “How it works” 4-step process: Discover → Build → Validate → Handoff
- “Proof” section: metrics placeholders (e.g., “99% pipeline success”, “X sources integrated”, “Y hours saved”) but do NOT fabricate numbers—use placeholders with guidance to fill later
- “Case study preview” 3 cards linking to case studies
- FAQ (8–10 questions) focused on common objections: pricing, timezones, NDAs, maintenance, security, approach, guarantees

SERVICES PAGES (EACH)
Each service page must include:
- Who it’s for
- Common problems
- Deliverables (concrete)
- Tools used (secondary)
- Typical engagements (3 packages):
  1) “Audit & Plan” (fixed price range placeholder)
  2) “Build Sprint” (fixed price range placeholder)
  3) “Ongoing Support” (monthly retainer placeholder)
- “What I need from you” checklist
- CTA blocks

CASE STUDIES
Create 3 anonymized case studies with realistic structure (NO fake company names implying real brands):
Case study format:
- Problem
- Constraints
- Approach
- Deliverables
- Result (use qualitative results unless user fills numbers)
Examples to cover:
1) Snowflake -> Databricks migration conversion + reconciliation tests
2) Zapier/n8n CRM automation for leads -> docs -> follow-ups
3) Incremental data feed: crawler/scraper -> DB -> monitoring -> daily updates

ABOUT PAGE
- Short bio placeholder: “Senior Data Engineer / Automation Specialist”
- Emphasize: senior hands-on, documentation, reliability, “no duct tape”
- “Principles” list: correctness, maintainability, observability, security basics

RESOURCES (SEO HUB)
Create /resources/index.html listing categories + 6 starter articles.
Create 6 full articles (600–1200 words each), written for SEO and genuinely useful.
Topics (slugs):
1) /resources/snowflake-to-databricks-migration-playbook.html
2) /resources/how-to-build-reliable-etl-pipelines.html
3) /resources/zapier-vs-n8n-for-crm-automation.html
4) /resources/incremental-web-scraping-data-feeds.html
5) /resources/hubspot-custom-code-dedupe-workflows.html
6) /resources/data-quality-checks-reconciliation-testing.html
Each article must include:
- proper H1, H2s
- table of contents (in-page anchor links)
- internal links to relevant service pages and contact
- meta title/description optimized
- FAQ section (3–5 Qs) for long-tail SEO
Do not claim certifications or specific years unless placeholders.
No plagiarism.

SEO TECHNICAL REQUIREMENTS
- Clean semantic HTML5
- One H1 per page
- Meta title + meta description unique per page
- OpenGraph + Twitter card tags
- canonical URLs (use https://[YOURDOMAIN.com]/path)
- sitemap.xml generation (static) including all pages
- robots.txt
- JSON-LD structured data:
  - Organization
  - LocalBusiness (if appropriate; otherwise Organization)
  - Service schema on service pages
  - FAQ schema on pages with FAQs
- Performance:
  - compress images
  - lazy-load images
  - minimal JS
  - no render-blocking giant bundles
- Accessibility:
  - aria labels where needed
  - keyboard navigable
  - color contrast

ANALYTICS
Add a lightweight analytics placeholder:
- Option A: Plausible snippet placeholder
- Option B: GA4 snippet placeholder
Put into a single config file to swap later.

REPO STRUCTURE (REQUIRED)
/
  README.md  (deployment + editing instructions)
  /public
    index.html
    about.html
    contact.html
    privacy.html
    404.html
    sitemap.xml
    robots.txt
    /services
      index.html
      data-engineering.html
      automation.html
      data-feeds.html
    /case-studies
      index.html
    /resources
      index.html
      snowflake-to-databricks-migration-playbook.html
      how-to-build-reliable-etl-pipelines.html
      zapier-vs-n8n-for-crm-automation.html
      incremental-web-scraping-data-feeds.html
      hubspot-custom-code-dedupe-workflows.html
      data-quality-checks-reconciliation-testing.html
    /assets
      /css
        styles.css
      /js
        main.js
        contact.js
      /img
        (placeholders)
  /infra
    deploy_s3_cloudfront.sh
    invalidate_cloudfront.sh
    aws_config.example.env

DEPLOYMENT SCRIPTS
- Provide bash scripts that assume AWS CLI configured.
- deploy_s3_cloudfront.sh should:
  - sync /public to an S3 bucket (bucket name placeholder)
  - set correct cache-control headers for html vs assets
  - optionally trigger CloudFront invalidation (or separate script)
- Include clear instructions in README:
  - create S3 bucket + enable static hosting
  - create CloudFront distribution
  - route53 record
  - ACM cert in us-east-1 for CloudFront
Keep it accurate and step-by-step.

INTERACTION REQUIREMENTS (JS)
- Mobile nav toggle
- Smooth scroll for in-page anchors
- Contact form validation + success/failure UX (no silent failures)
- “Copy email” button on contact page
No other heavy JS.

CONTENT SAFETY / COMPLIANCE
- Do not claim you can scrape Upwork.
- Do not claim partnerships/certifications you don’t have.
- Avoid making up client logos or brand names.
- Use placeholders where needed like: [BUSINESS NAME], [EMAIL], [CALENDLY], [LINKEDIN]

DELIVERY
Output:
1) Full repo with all pages and content written
2) README with deployment and customization steps
3) Notes: a short checklist of what I should fill in (placeholders)

Start building now. Do not ask questions. Use best assumptions and placeholders.
