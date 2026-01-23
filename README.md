# JL3 Data Engineering Consulting Website

Professional static website for data engineering and automation consulting. Built with vanilla HTML, CSS, and JavaScript for maximum performance and simplicity.

**Live Site:** https://jamesjlaurieiii.com

## About This Project

Personal consulting website showcasing:
- Data engineering services (migrations, pipelines, warehouse modernization)
- Automation & integrations (CRM ops, workflow automation)
- Data extraction & feeds (web scraping, API integration)
- Real case study: HubSpot CRM integration for Charter Schools USA
- Technical resources and guides

**Core Message:** "Data systems you can actually maintain" - emphasis on building for handoff, not dependency.

## Quick Start

### Local Development

```bash
# Start local server
python -m http.server 8000 --directory public

# Visit http://localhost:8000
```

### Deploy to Production

```bash
# Deploy to S3 and invalidate CloudFront cache
bash infra/deploy_s3_cloudfront.sh

# The script will:
# 1. Sync public/ folder to S3 bucket
# 2. Invalidate CloudFront cache
# 3. Output deployment status
```

## Project Structure

```
jl3_data_frontend/
├── public/                     # Static site files (deployed to S3)
│   ├── index.html             # Homepage
│   ├── about.html             # About page with authentic story
│   ├── process.html           # 4-phase engagement process
│   ├── contact.html           # Contact page (Calendly + email)
│   ├── privacy.html           # Privacy policy
│   ├── 404.html               # Error page
│   ├── sitemap.xml            # SEO sitemap
│   ├── robots.txt             # Search engine directives
│   ├── services/              # Service detail pages
│   │   ├── index.html         # Services overview
│   │   ├── data-engineering.html
│   │   ├── automation.html
│   │   └── data-feeds.html
│   ├── case-studies/          # Case studies
│   │   ├── index.html         # Case studies landing
│   │   └── hubspot-charter-school-crm-integration.html
│   ├── resources/             # SEO-focused technical content
│   │   ├── index.html
│   │   ├── hubspot-power-bi-integration-guide.html
│   │   └── [other guides].html
│   └── assets/
│       ├── css/styles.css     # All styles in one file
│       ├── js/main.js         # Navigation, FAQ, interactions
│       └── img/               # Images and assets
├── infra/                      # Infrastructure and deployment
│   ├── aws_config.env         # AWS configuration (gitignored)
│   ├── aws_config.example.env # Template for AWS config
│   ├── deploy_s3_cloudfront.sh # Main deployment script
│   ├── invalidate_cloudfront.sh # Cache invalidation
│   └── INFRASTRUCTURE.md      # Detailed AWS setup guide
├── DEPLOYMENTS.md              # Deployment history log
├── REDESIGN_PLAN.md            # Design philosophy and brand guide
└── DEVELOPMENT.md              # Development workflow guide
```

## Infrastructure

**Hosting:** AWS (S3 + CloudFront + Route53)
- **S3 Bucket:** jamesjlaurieiii.com (static website hosting)
- **CloudFront Distribution:** EONN2KZRY6530 (CDN + HTTPS)
- **CloudFront Function:** jl3-directory-index-rewrite (handles directory URLs)
- **Domain:** jamesjlaurieiii.com (Route53)
- **Region:** us-east-1
- **AWS Profile:** terraform-admin
- **Security:** OAC (Origin Access Control) - bucket is private, CloudFront has secure access

**Directory Index Handling:**
The CloudFront Function automatically rewrites directory URLs (e.g., `/services/` → `/services/index.html`) while maintaining clean URLs and secure OAC setup. See `infra/cloudfront-function-directory-index.js`.

See `infra/INFRASTRUCTURE.md` for detailed setup instructions.

## Development Workflow

### Making Changes

1. **Edit files locally** in the `public/` directory
2. **Test locally:**
   ```bash
   python -m http.server 8000 --directory public
   ```
3. **Commit changes:**
   ```bash
   git add -A
   git commit -m "Description of changes"
   ```
4. **Deploy to production:**
   ```bash
   bash infra/deploy_s3_cloudfront.sh
   ```
5. **Push to GitHub:**
   ```bash
   git push origin main
   ```
6. **Update DEPLOYMENTS.md** with deployment details

See `DEVELOPMENT.md` for detailed workflow guide.

## Key Features

### Performance
- **Lighthouse Score:** 90+ across all metrics
- Single CSS file (no render-blocking)
- Minimal JavaScript, no frameworks
- Optimized images
- CloudFront CDN for global distribution

### SEO
- Semantic HTML5
- Meta tags (title, description, OG tags)
- Structured data (Schema.org JSON-LD)
- Sitemap and robots.txt
- Clean, descriptive URLs

### Design Philosophy
- Clean, professional aesthetic
- Authentic voice (no generic consulting speak)
- Emphasis on building systems for handoff
- Real project showcases (no fake testimonials)
- Mobile-responsive

## Configuration

### Contact Links
- **Calendly:** https://calendly.com/jamesjlaurieiii/new-meeting
- **Email:** jamesjlaurieiii@gmail.com
- **LinkedIn:** https://www.linkedin.com/in/jlaurie3/
- **GitHub:** https://github.com/JLaurieIII

### Navigation
All pages have consistent nav:
- Services → /services/
- Case Studies → /case-studies/
- Resources → /resources/
- About → /about.html
- Contact → /contact.html
- CTA Button: "Book a Call" (Calendly)

## Content Guidelines

### Brand Voice
- **Authentic, not generic:** Real experience, real projects
- **Technical but accessible:** Explain concepts clearly
- **Build for independence:** Emphasize handoff, not dependency
- **No BS:** Avoid consultant clichés and buzzwords

### Services
1. **Data Engineering & Migrations** - Platform migrations, pipeline builds, reconciliation testing
2. **Automation & Integrations** - CRM automation, workflow tools, API integrations
3. **Data Extraction & Feeds** - Web scraping, incremental feeds, monitoring

### Case Studies
- **Real project only:** HubSpot CRM integration for Charter Schools USA
- **Coming soon placeholders:** 5 additional case studies (greyed out)
- **Scenario-based format:** Challenge → Solution → Impact

See `REDESIGN_PLAN.md` for detailed content strategy.

## Deployment History

All production deployments are tracked in `DEPLOYMENTS.md` with:
- Date and time
- Git commit hash
- CloudFront invalidation ID
- Files deployed
- Changes made
- Status and notes

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, flexbox, grid
- **Vanilla JavaScript** - No frameworks
- **AWS S3** - Static hosting
- **AWS CloudFront** - CDN and HTTPS
- **AWS Route53** - DNS
- **Python** - Local development server
- **Bash** - Deployment scripts
- **Git/GitHub** - Version control

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive (iOS Safari, Chrome Mobile)
- Graceful degradation for older browsers

## Performance Optimizations

- Single CSS file (no render-blocking)
- Minimal JavaScript (< 5KB total)
- Font preconnect for Google Fonts
- CloudFront caching with long TTL
- Optimized images (WebP where supported)
- No external dependencies except fonts

## Security

- HTTPS enforced via CloudFront
- No sensitive data in repository
- `aws_config.env` gitignored
- No user authentication/sessions
- No server-side code
- Static files only

## Maintenance

### Regular Tasks
- Update case studies as projects complete
- Add new technical resources for SEO
- Review analytics and adjust content
- Keep Calendly link active
- Monitor CloudFront costs

### Monitoring
- CloudFront Dashboard for traffic/errors
- S3 bucket metrics
- CloudWatch for 4xx/5xx errors
- Manual testing after deployments

## Future Enhancements

See GitHub Issues for planned features:
- Additional case studies (5 coming soon)
- More SEO-focused technical guides
- Analytics integration (Plausible or GA4)
- Newsletter signup (optional)
- Testimonials from real clients (when available)

## Documentation

- **README.md** (this file) - Project overview
- **DEVELOPMENT.md** - Development workflow and best practices
- **DEPLOYMENTS.md** - Deployment history and procedures
- **REDESIGN_PLAN.md** - Brand positioning and content strategy
- **infra/INFRASTRUCTURE.md** - AWS infrastructure setup

## License

Copyright © 2024 James J. Laurie III. All rights reserved.

This is a personal business website. Code structure may be referenced, but content is copyrighted.

## Contact

**James J. Laurie III**
- Email: jamesjlaurieiii@gmail.com
- LinkedIn: https://www.linkedin.com/in/jlaurie3/
- Website: https://jamesjlaurieiii.com
