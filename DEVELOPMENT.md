# Development Guide

This guide covers development workflows, best practices, and common tasks for maintaining the JL3 Data website.

## Table of Contents

- [Local Development](#local-development)
- [Git Workflow](#git-workflow)
- [Deployment Process](#deployment-process)
- [Making Changes](#making-changes)
- [Best Practices](#best-practices)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Local Development

### Starting the Development Server

```bash
# From project root
python -m http.server 8000 --directory public

# Server will be available at http://localhost:8000
```

**Alternative methods:**

```bash
# Using Node.js (if installed)
npx http-server public -p 8000

# Using PHP (if installed)
cd public && php -S localhost:8000
```

### Testing Changes Locally

1. Make your edits to files in `public/`
2. Save the file
3. Refresh your browser (no restart needed)
4. Test on multiple screen sizes (use browser dev tools)
5. Check browser console for JavaScript errors
6. Verify links work correctly

### Browser Dev Tools

**Useful shortcuts:**
- `F12` or `Cmd+Option+I` - Open dev tools
- `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows) - Toggle device toolbar
- `Cmd+R` (Mac) / `Ctrl+R` (Windows) - Refresh
- `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows) - Hard refresh

## Git Workflow

### Standard Workflow

```bash
# 1. Check status
git status

# 2. Review changes
git diff

# 3. Stage all changes
git add -A

# 4. Commit with descriptive message
git commit -m "Description of changes

- Detail 1
- Detail 2
- Detail 3

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# 5. Push to GitHub
git push origin main
```

### Commit Message Guidelines

**Good commit messages:**
- Start with imperative verb (Add, Update, Fix, Remove)
- Be specific about what changed
- Include bullet points for multiple changes
- Reference issue numbers if applicable

**Examples:**

```
✅ Fix navigation bar layout on mobile devices

- Adjust breakpoint for hamburger menu
- Fix z-index overlap with hero section
- Test on iPhone and Android devices
```

```
✅ Add HubSpot integration case study

- Create detailed case study page
- Add flowchart diagram
- Update case studies landing page
- Include impact metrics and technologies
```

```
❌ Update stuff
❌ Fix bug
❌ Changes
```

### Viewing Git History

```bash
# See recent commits
git log --oneline -10

# See commits with changes
git log --stat -5

# Search commits
git log --grep="navigation"

# See all changes in a commit
git show [commit-hash]
```

## Deployment Process

### Full Deployment Workflow

```bash
# 1. Test locally
python -m http.server 8000 --directory public
# Visit http://localhost:8000 and test thoroughly

# 2. Commit changes
git add -A
git commit -m "Description of changes"

# 3. Deploy to S3
bash infra/deploy_s3_cloudfront.sh

# 4. Push to GitHub
git push origin main

# 5. Update deployment log
# Edit DEPLOYMENTS.md and add entry with:
# - Date/time
# - Commit hash (from git log)
# - CloudFront invalidation ID (from deployment output)
# - Description of changes

# 6. Commit deployment log
git add DEPLOYMENTS.md
git commit -m "Update deployment log"
git push origin main
```

### Deploy Script Details

The `infra/deploy_s3_cloudfront.sh` script:

1. Loads configuration from `infra/aws_config.env`
2. Syncs `public/` to S3 bucket with proper content types
3. Sets cache headers for assets
4. Invalidates CloudFront cache (forces refresh)
5. Outputs deployment status and CloudFront invalidation ID

**Cache invalidation takes 1-2 minutes** - the site won't show changes immediately.

### Environment Configuration

The `infra/aws_config.env` file contains:

```bash
S3_BUCKET=jamesjlaurieiii.com
CLOUDFRONT_DISTRIBUTION_ID=EONN2KZRY6530
AWS_PROFILE=terraform-admin
AWS_REGION=us-east-1
```

This file is **gitignored** to avoid accidentally committing AWS credentials.

## Making Changes

### Adding a New Page

1. **Create HTML file** in `public/` or subdirectory
2. **Copy header/nav** from existing page for consistency
3. **Copy footer** from existing page
4. **Update navigation** (add link if needed)
5. **Update sitemap.xml** with new URL
6. **Test locally**
7. **Deploy**

### Updating Existing Content

1. **Locate the file** (use `grep` or file explorer)
2. **Edit content** (text, links, images)
3. **Maintain existing structure** (don't break layouts)
4. **Test locally**
5. **Commit and deploy**

### Adding Images

1. **Optimize images first** (use tools like TinyPNG, ImageOptim)
2. **Place in `public/assets/img/`**
3. **Use descriptive filenames:** `hubspot-integration-flowchart.png`, not `image1.png`
4. **Reference in HTML:**
   ```html
   <img src="/assets/img/your-image.png" alt="Descriptive alt text">
   ```
5. **Add to git and deploy**

### Updating Styles

All styles are in `public/assets/css/styles.css`.

**CSS Organization:**
- Variables (`:root`)
- Base styles (html, body, typography)
- Layout (container, grid, sections)
- Components (nav, buttons, cards, forms)
- Utilities (spacing, colors, text)
- Media queries (responsive)

**Changing colors:**

```css
:root {
  --color-accent: #14b8a6;  /* Primary accent */
  --color-warm: #f59e0b;    /* Warm accent */
}
```

**Adding new styles:**
- Add at the bottom of the relevant section
- Use existing class naming conventions
- Test across screen sizes
- Consider adding comments for complex styles

### Updating JavaScript

Files in `public/assets/js/`:
- `main.js` - Navigation, FAQ toggles, interactions

**Common updates:**
- Mobile navigation behavior
- FAQ accordion logic
- Scroll animations (if added)

**Testing JavaScript:**
1. Open browser console (F12)
2. Check for errors
3. Test interactive elements
4. Test on mobile (use dev tools device emulation)

## Best Practices

### Code Quality

1. **Semantic HTML** - Use appropriate tags (`<nav>`, `<article>`, `<section>`)
2. **Accessible** - Include `alt` text, ARIA labels, proper headings hierarchy
3. **Consistent formatting** - Indent with 2 spaces, consistent naming
4. **No dead code** - Remove unused CSS/JS, delete backup files
5. **Comments** - Add comments for complex sections

### File Organization

```
✅ Good:
- hubspot-integration-flowchart.png
- data-engineering-services.html
- footer-links-section

❌ Bad:
- image1.png
- page2.html
- temp-backup-old-2.html
```

### Performance

1. **Optimize images** before uploading (< 200KB each)
2. **Minimize CSS/JS** (keep files small)
3. **Use CDN fonts** (Google Fonts preconnect)
4. **Set cache headers** (handled by deploy script)
5. **Test Lighthouse scores** (aim for 90+)

### Security

1. **Never commit secrets** (AWS credentials, API keys)
2. **Use HTTPS** (enforced via CloudFront)
3. **Validate user input** (if adding forms)
4. **Keep dependencies updated** (if adding any)

### Git Hygiene

1. **Commit often** (small, focused commits)
2. **Write good messages** (see commit guidelines above)
3. **Don't commit backup files** (use .gitignore)
4. **Review changes before commit** (`git diff`)
5. **Push after deploying** (keep GitHub in sync)

## Common Tasks

### Update Calendly Link

```bash
# Find all occurrences
grep -r "calendly.com" public/

# Replace all at once (use with caution)
find public -name "*.html" -type f -exec sed -i 's|old-link|new-link|g' {} +
```

### Update Contact Email

```bash
# Find all occurrences
grep -r "jamesjlaurieiii@gmail.com" public/

# Replace manually or with sed
```

### Add New Case Study

1. Copy `public/case-studies/hubspot-charter-school-crm-integration.html`
2. Rename and edit content
3. Add card to `public/case-studies/index.html`
4. Update sitemap.xml
5. Test, commit, deploy

### Update Service Offerings

Edit these files:
- `public/services/index.html` (overview)
- `public/services/data-engineering.html`
- `public/services/automation.html`
- `public/services/data-feeds.html`

### Update About Page

Edit `public/about.html` - maintain authentic voice and real experience.

### Check CloudFront Status

```bash
# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id EONN2KZRY6530 \
  --id [INVALIDATION_ID] \
  --profile terraform-admin

# List recent invalidations
aws cloudfront list-invalidations \
  --distribution-id EONN2KZRY6530 \
  --profile terraform-admin
```

### View S3 Bucket Contents

```bash
# List all files
aws s3 ls s3://jamesjlaurieiii.com --recursive --profile terraform-admin

# List specific directory
aws s3 ls s3://jamesjlaurieiii.com/services/ --profile terraform-admin

# Check file size
aws s3 ls s3://jamesjlaurieiii.com --recursive --human-readable --profile terraform-admin
```

## Troubleshooting

### Changes Not Showing on Live Site

**Problem:** Deployed but site looks the same

**Solutions:**
1. Check CloudFront invalidation status (takes 1-2 minutes)
2. Hard refresh browser (`Cmd+Shift+R` or `Ctrl+Shift+R`)
3. Clear browser cache
4. Check in incognito/private window
5. Verify files uploaded to S3:
   ```bash
   aws s3 ls s3://jamesjlaurieiii.com/[path] --profile terraform-admin
   ```

### Navigation Bar Broken

**Problem:** Nav links wrong or layout broken

**Solutions:**
1. Check all HTML files have consistent nav structure
2. Verify no typos in `<a href="">` tags
3. Check CSS classes match (`.nav-link`, `.nav-cta`)
4. Test mobile hamburger menu

### Deploy Script Fails

**Problem:** `./infra/deploy_s3_cloudfront.sh` errors

**Common causes:**
1. AWS credentials not configured or expired
2. Wrong AWS profile
3. S3 bucket name mismatch
4. CloudFront distribution ID incorrect

**Debug:**
```bash
# Check AWS credentials
aws sts get-caller-identity --profile terraform-admin

# Verify config file
cat infra/aws_config.env

# Test S3 access
aws s3 ls s3://jamesjlaurieiii.com --profile terraform-admin
```

### Git Conflicts

**Problem:** Can't push due to conflicts

**Solutions:**
```bash
# Pull latest changes
git pull origin main

# If conflicts, resolve manually then:
git add [resolved-files]
git commit -m "Resolve merge conflicts"
git push origin main
```

### Accidentally Committed Secrets

**Problem:** Committed `aws_config.env` or credentials

**Immediate action:**
1. **Rotate credentials** in AWS Console
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch infra/aws_config.env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (only if repo is private):
   ```bash
   git push origin --force --all
   ```

## Testing Checklist

Before deploying:

- [ ] Test locally on `localhost:8000`
- [ ] Check all links work
- [ ] Test mobile responsive (use dev tools)
- [ ] Check browser console for errors
- [ ] Verify images load
- [ ] Test navigation (all pages)
- [ ] Spell check content
- [ ] Commit with good message
- [ ] Deploy to S3
- [ ] Wait for CloudFront invalidation
- [ ] Test live site in incognito
- [ ] Push to GitHub
- [ ] Update DEPLOYMENTS.md

## Resources

- **AWS S3 Static Hosting:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- **CloudFront Distribution:** https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/
- **Git Best Practices:** https://git-scm.com/book/en/v2
- **HTML Semantic Elements:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element
- **Lighthouse Performance:** https://developer.chrome.com/docs/lighthouse/

## Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review `DEPLOYMENTS.md` for recent changes
3. Check git history: `git log`
4. Consult AWS documentation
5. Review CloudFront/S3 logs in AWS Console

## Maintenance Schedule

**Weekly:**
- Check for any error emails from AWS
- Review CloudFront traffic/costs
- Test site on live URL

**Monthly:**
- Review analytics (if/when added)
- Update content as needed
- Check for broken links
- Review Calendly bookings (ensure link works)

**Quarterly:**
- Add new case studies
- Update services/offerings
- Review and update technical resources
- Refresh testimonials (when available)

**Annually:**
- Review AWS costs and optimize
- Update copyright year
- Major content refresh if needed
- Review security best practices
