# Data Engineering Consulting Website

A production-ready static website for a solo data engineering and automation consultant. Built with vanilla HTML, CSS, and JavaScript for maximum performance and simplicity.

## Quick Start

1. **Configure your settings** - Search and replace these placeholders throughout the codebase:
   - `[BUSINESS NAME]` - Your business name
   - `[YOURDOMAIN.com]` - Your domain (e.g., `example.com`)
   - `[EMAIL]` - Your contact email
   - `[CALENDLY]` - Your Calendly booking link
   - `[LINKEDIN]` - Your LinkedIn profile URL
   - `[GITHUB]` - Your GitHub profile URL
   - `[YOUR_FORMSPREE_ID]` - Your Formspree form ID (sign up at formspree.io)

2. **Test locally** - Open `public/index.html` in a browser or use a local server:
   ```bash
   cd public && python -m http.server 8000
   # Visit http://localhost:8000
   ```

3. **Deploy** - Follow AWS setup instructions below, then run:
   ```bash
   ./infra/deploy_s3_cloudfront.sh
   ```

## Project Structure

```
/
├── README.md                 # This file
├── public/                   # Static site files (deploy this folder)
│   ├── index.html           # Homepage
│   ├── about.html           # About page
│   ├── contact.html         # Contact form
│   ├── privacy.html         # Privacy policy
│   ├── 404.html             # Error page
│   ├── sitemap.xml          # SEO sitemap
│   ├── robots.txt           # Search engine directives
│   ├── services/
│   │   ├── index.html       # Services overview
│   │   ├── data-engineering.html
│   │   ├── automation.html
│   │   └── data-feeds.html
│   ├── case-studies/
│   │   └── index.html       # Case studies
│   ├── resources/
│   │   ├── index.html       # Blog/resources hub
│   │   └── *.html           # Individual articles
│   └── assets/
│       ├── css/styles.css   # All styles
│       ├── js/main.js       # Navigation, FAQ, interactions
│       ├── js/contact.js    # Contact form handling
│       └── img/             # Images (add your own)
└── infra/
    ├── aws_config.example.env    # AWS config template
    ├── deploy_s3_cloudfront.sh   # Deployment script
    └── invalidate_cloudfront.sh  # Cache invalidation
```

## AWS Deployment Setup

### Prerequisites
- AWS CLI installed and configured (`aws configure`)
- An AWS account with appropriate permissions

### Step 1: Create S3 Bucket

```bash
# Create bucket (use your domain name)
aws s3 mb s3://yourdomain-com --region us-east-1

# Enable static website hosting
aws s3 website s3://yourdomain-com --index-document index.html --error-document 404.html

# Set bucket policy for public read (create policy.json first)
```

Create `policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::yourdomain-com/*"
    }
  ]
}
```

Apply policy:
```bash
aws s3api put-bucket-policy --bucket yourdomain-com --policy file://policy.json
```

### Step 2: Request SSL Certificate (ACM)

**Important:** Certificate MUST be in `us-east-1` for CloudFront.

```bash
aws acm request-certificate \
    --domain-name yourdomain.com \
    --subject-alternative-names "*.yourdomain.com" \
    --validation-method DNS \
    --region us-east-1
```

Complete DNS validation in AWS Console or via CLI.

### Step 3: Create CloudFront Distribution

In AWS Console:
1. Go to CloudFront → Create Distribution
2. Origin domain: Select your S3 bucket's website endpoint (NOT the bucket itself)
3. Viewer protocol policy: Redirect HTTP to HTTPS
4. Alternate domain name (CNAME): yourdomain.com, www.yourdomain.com
5. Custom SSL certificate: Select your ACM certificate
6. Default root object: index.html
7. Create custom error response for 404 → /404.html

Note the Distribution ID for your config.

### Step 4: Configure Route 53

1. Create hosted zone for your domain (if not exists)
2. Create A record:
   - Name: yourdomain.com
   - Type: A
   - Alias: Yes
   - Route to: CloudFront distribution
3. Create another A record for www subdomain

### Step 5: Configure Deployment

```bash
cp infra/aws_config.example.env infra/aws_config.env
# Edit aws_config.env with your values
```

### Step 6: Deploy

```bash
chmod +x infra/*.sh
./infra/deploy_s3_cloudfront.sh
```

## Contact Form Setup

The contact form uses [Formspree](https://formspree.io) by default:

1. Sign up at formspree.io
2. Create a new form
3. Copy your form ID
4. Replace `[YOUR_FORMSPREE_ID]` in `contact.html`

### Alternative: AWS-Native (API Gateway + Lambda + SES)

For an AWS-native solution:
1. Create Lambda function to process form submissions
2. Create API Gateway endpoint
3. Configure SES for sending emails
4. Update form action URL in `contact.html`

## Customization

### Placeholders to Fill In

Search for these in all files and replace with your information:

| Placeholder | Description |
|-------------|-------------|
| `[BUSINESS NAME]` | Your business name |
| `[YOURDOMAIN.com]` | Your domain |
| `[EMAIL]` | Contact email |
| `[CALENDLY]` | Calendly booking link |
| `[LINKEDIN]` | LinkedIn URL |
| `[GITHUB]` | GitHub URL |
| `[YOUR_FORMSPREE_ID]` | Formspree form ID |
| `[X,XXX]` | Pricing placeholders |
| `[XX]` | Metric placeholders |
| `[DATE]` | Privacy policy date |
| `[GA4_ID]` | Google Analytics ID |
| `[YOUR TZ]` | Your timezone |

### Analytics Setup

**Option A: Plausible (Privacy-friendly)**
Uncomment and configure in each HTML file's `<head>`:
```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

**Option B: Google Analytics 4**
Uncomment and configure:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

### Adding Images

Place images in `public/assets/img/`. Recommended:
- Logo: `logo.png` (transparent background)
- OG image: `og-image.jpg` (1200x630px for social sharing)
- Favicons: Generate at realfavicongenerator.net

### Updating Styles

All styles are in `public/assets/css/styles.css`. Key customizations:

```css
:root {
  /* Change primary accent color */
  --color-accent: #14b8a6;

  /* Change fonts (update Google Fonts link too) */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Source Sans 3', sans-serif;
}
```

## Performance Tips

This site is designed for Lighthouse 90+:

- All CSS is in one file (no render-blocking)
- Minimal JavaScript, no frameworks
- Fonts are preconnected
- Images should be optimized before uploading
- Cache headers are set for long-term caching of assets

## License

This template is provided for personal/commercial use. Customize freely.

## Support

For questions about this template, contact: [EMAIL]
