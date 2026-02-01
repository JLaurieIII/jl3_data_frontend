# Analytics Dashboard

A Streamlit dashboard that queries your analytics data from S3 using DuckDB.

## How It Works

```
S3 (gzipped JSON) → DuckDB (in-memory SQL) → Streamlit (charts)
```

**DuckDB** is like SQLite but optimized for analytics. It can:
- Query millions of rows in milliseconds
- Read directly from S3, Parquet, CSV, JSON
- Run SQL on pandas DataFrames

## Setup

```powershell
cd C:\Users\paper\desktop\jl3_data_frontend\dashboard

# Create virtual environment (optional but recommended)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

## Run the Dashboard

```powershell
streamlit run app.py
```

This opens http://localhost:8501 in your browser.

## What You'll See

1. **Key Metrics** - Total events, unique sessions, page views, CTA clicks
2. **Traffic Analysis** - Events by type, top pages
3. **UTM Attribution** - Traffic by source and campaign
4. **Timeline** - Events over time
5. **SQL Playground** - Write your own queries!

## SQL Examples (DuckDB)

The data is in a DataFrame called `df`. You can query it directly:

```sql
-- Top pages
SELECT page_path, COUNT(*) as views
FROM df
WHERE event_type = 'page_view'
GROUP BY 1
ORDER BY 2 DESC

-- Traffic by hour
SELECT hour, COUNT(*) as events
FROM df
GROUP BY 1
ORDER BY 1

-- UTM attribution
SELECT utm_source, utm_campaign, COUNT(DISTINCT session_id) as sessions
FROM df
WHERE utm_source IS NOT NULL
GROUP BY 1, 2
ORDER BY 3 DESC

-- Conversion funnel (page view → CTA click)
SELECT
    COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_id END) as viewed,
    COUNT(DISTINCT CASE WHEN event_type = 'cta_click' THEN session_id END) as clicked
FROM df
```

## Data Location

Your analytics data lives in S3:
```
s3://jl3-static-site-analytics-data/raw/year=YYYY/month=MM/day=DD/hour=HH/
```

Files are gzipped newline-delimited JSON. Firehose writes every 5 minutes.

## Troubleshooting

**No data showing?**
- Firehose buffers for up to 5 minutes before writing to S3
- Visit your site, wait 5 minutes, then refresh

**AWS credentials error?**
- Make sure your `terraform-admin` profile is configured
- Or change `AWS_PROFILE` in app.py
