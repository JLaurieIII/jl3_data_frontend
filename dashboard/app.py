"""
Analytics Dashboard for jamesjlaurieiii.com

This dashboard uses DuckDB to query analytics data from S3 and displays
it using Streamlit. DuckDB can query gzipped JSON files directly!

Run with: streamlit run app.py
"""

import streamlit as st
import duckdb
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import boto3
import json
import gzip
import io
import os

# =============================================================================
# CONFIGURATION
# =============================================================================

S3_BUCKET = "jl3-static-site-analytics-data"
S3_PREFIX = "raw/"
AWS_PROFILE = "terraform-admin"  # Change if using different profile

# =============================================================================
# PAGE CONFIG
# =============================================================================

st.set_page_config(
    page_title="JL3 Analytics Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# =============================================================================
# DATA LOADING
# =============================================================================

@st.cache_data(ttl=300)  # Cache for 5 minutes
def load_data_from_s3():
    """
    Download and parse analytics data from S3.

    The data is stored as gzipped JSON files in Hive-style partitions:
    s3://bucket/raw/year=2026/month=01/day=31/hour=23/file.gz

    Each file contains newline-delimited JSON (one event per line).
    """
    try:
        # Create S3 client with profile
        session = boto3.Session(profile_name=AWS_PROFILE)
        s3 = session.client('s3')

        # List all objects in the raw prefix
        all_events = []
        paginator = s3.get_paginator('list_objects_v2')

        for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=S3_PREFIX):
            for obj in page.get('Contents', []):
                key = obj['Key']

                # Skip if not a data file
                if not key.endswith('.gz'):
                    continue

                # Download and decompress
                response = s3.get_object(Bucket=S3_BUCKET, Key=key)
                compressed = response['Body'].read()

                try:
                    decompressed = gzip.decompress(compressed).decode('utf-8')

                    # Parse newline-delimited JSON
                    for line in decompressed.strip().split('\n'):
                        if line:
                            try:
                                event = json.loads(line)
                                all_events.append(event)
                            except json.JSONDecodeError:
                                continue
                except Exception as e:
                    st.warning(f"Could not parse {key}: {e}")
                    continue

        if not all_events:
            return pd.DataFrame()

        # Convert to DataFrame
        df = pd.DataFrame(all_events)

        # Parse timestamps
        if 'event_ts' in df.columns:
            df['event_ts'] = pd.to_datetime(df['event_ts'], errors='coerce')
            df['date'] = df['event_ts'].dt.date
            df['hour'] = df['event_ts'].dt.hour

        return df

    except Exception as e:
        st.error(f"Error loading data from S3: {e}")
        return pd.DataFrame()


def query_with_duckdb(df, query):
    """
    Run a SQL query on a DataFrame using DuckDB.

    DuckDB is like SQLite but optimized for analytics. It's FAST and can
    handle millions of rows easily. You can query DataFrames directly!

    Example:
        query_with_duckdb(df, "SELECT event_type, COUNT(*) FROM df GROUP BY 1")
    """
    if df.empty:
        return pd.DataFrame()

    try:
        conn = duckdb.connect()
        result = conn.execute(query).fetchdf()
        conn.close()
        return result
    except Exception as e:
        st.error(f"Query error: {e}")
        return pd.DataFrame()


# =============================================================================
# DASHBOARD UI
# =============================================================================

def main():
    st.title("📊 JL3 Analytics Dashboard")
    st.markdown("Real-time analytics for jamesjlaurieiii.com")

    # Sidebar
    st.sidebar.header("🔧 Settings")

    if st.sidebar.button("🔄 Refresh Data"):
        st.cache_data.clear()
        st.rerun()

    # Load data
    with st.spinner("Loading data from S3..."):
        df = load_data_from_s3()

    if df.empty:
        st.warning("No data found yet. Visit your site to generate some events!")
        st.info("""
        **How data flows:**
        1. You visit jamesjlaurieiii.com
        2. analytics.js sends events to API Gateway
        3. Lambda validates and sends to Kinesis
        4. Firehose batches and writes to S3 (every 5 min or 128MB)
        5. This dashboard reads from S3

        **Note:** Firehose buffers for up to 5 minutes before writing to S3.
        Generate some traffic and wait a few minutes!
        """)

        # Show test query section anyway
        st.subheader("🧪 Test the Pipeline")
        if st.button("Send Test Event"):
            import subprocess
            result = subprocess.run([
                'curl', '-s', '-X', 'POST',
                'https://jdsbdf3t47.execute-api.us-east-1.amazonaws.com/v1/events',
                '-H', 'Content-Type: application/json',
                '-H', 'Origin: https://jamesjlaurieiii.com',
                '-d', json.dumps({
                    "event_type": "page_view",
                    "event_id": f"test-{datetime.now().isoformat()}",
                    "session_id": "dashboard-test-session",
                    "property": "jamesjlaurieiii",
                    "page_path": "/dashboard-test",
                    "event_ts": datetime.now().isoformat() + "Z"
                })
            ], capture_output=True, text=True)
            st.code(result.stdout)
        return

    # ---------------------------------------------------------------------
    # KEY METRICS
    # ---------------------------------------------------------------------
    st.header("📈 Key Metrics")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        total_events = len(df)
        st.metric("Total Events", f"{total_events:,}")

    with col2:
        unique_sessions = df['session_id'].nunique() if 'session_id' in df.columns else 0
        st.metric("Unique Sessions", f"{unique_sessions:,}")

    with col3:
        page_views = len(df[df['event_type'] == 'page_view']) if 'event_type' in df.columns else 0
        st.metric("Page Views", f"{page_views:,}")

    with col4:
        cta_clicks = len(df[df['event_type'] == 'cta_click']) if 'event_type' in df.columns else 0
        st.metric("CTA Clicks", f"{cta_clicks:,}")

    # ---------------------------------------------------------------------
    # CHARTS
    # ---------------------------------------------------------------------
    st.header("📊 Traffic Analysis")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Events by Type")
        if 'event_type' in df.columns:
            event_counts = query_with_duckdb(df, """
                SELECT event_type, COUNT(*) as count
                FROM df
                GROUP BY event_type
                ORDER BY count DESC
            """)
            if not event_counts.empty:
                fig = px.pie(event_counts, values='count', names='event_type',
                            color_discrete_sequence=px.colors.qualitative.Set2)
                st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Top Pages")
        if 'page_path' in df.columns:
            page_counts = query_with_duckdb(df, """
                SELECT page_path, COUNT(*) as views
                FROM df
                WHERE event_type = 'page_view'
                GROUP BY page_path
                ORDER BY views DESC
                LIMIT 10
            """)
            if not page_counts.empty:
                fig = px.bar(page_counts, x='views', y='page_path', orientation='h',
                            color_discrete_sequence=['#1f77b4'])
                fig.update_layout(yaxis={'categoryorder':'total ascending'})
                st.plotly_chart(fig, use_container_width=True)

    # ---------------------------------------------------------------------
    # UTM ATTRIBUTION
    # ---------------------------------------------------------------------
    st.header("🎯 UTM Attribution")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Traffic by Source")
        if 'utm_source' in df.columns:
            source_counts = query_with_duckdb(df, """
                SELECT
                    COALESCE(utm_source, '(direct)') as source,
                    COUNT(*) as visits
                FROM df
                WHERE event_type = 'page_view'
                GROUP BY utm_source
                ORDER BY visits DESC
            """)
            if not source_counts.empty:
                fig = px.bar(source_counts, x='source', y='visits',
                            color_discrete_sequence=['#2ca02c'])
                st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Traffic by Campaign")
        if 'utm_campaign' in df.columns:
            campaign_counts = query_with_duckdb(df, """
                SELECT
                    COALESCE(utm_campaign, '(none)') as campaign,
                    COUNT(*) as visits
                FROM df
                WHERE event_type = 'page_view' AND utm_campaign IS NOT NULL
                GROUP BY utm_campaign
                ORDER BY visits DESC
                LIMIT 10
            """)
            if not campaign_counts.empty:
                fig = px.bar(campaign_counts, x='campaign', y='visits',
                            color_discrete_sequence=['#ff7f0e'])
                st.plotly_chart(fig, use_container_width=True)

    # ---------------------------------------------------------------------
    # TIMELINE
    # ---------------------------------------------------------------------
    st.header("📅 Events Over Time")

    if 'event_ts' in df.columns and 'date' in df.columns:
        daily_counts = query_with_duckdb(df, """
            SELECT
                date,
                COUNT(*) as events,
                COUNT(DISTINCT session_id) as sessions
            FROM df
            GROUP BY date
            ORDER BY date
        """)
        if not daily_counts.empty:
            fig = go.Figure()
            fig.add_trace(go.Scatter(x=daily_counts['date'], y=daily_counts['events'],
                                    mode='lines+markers', name='Events'))
            fig.add_trace(go.Scatter(x=daily_counts['date'], y=daily_counts['sessions'],
                                    mode='lines+markers', name='Sessions'))
            fig.update_layout(xaxis_title='Date', yaxis_title='Count')
            st.plotly_chart(fig, use_container_width=True)

    # ---------------------------------------------------------------------
    # RAW DATA & SQL PLAYGROUND
    # ---------------------------------------------------------------------
    st.header("🔍 Data Explorer")

    with st.expander("View Raw Data"):
        st.dataframe(df.head(100))

    with st.expander("SQL Playground (DuckDB)"):
        st.markdown("""
        **Query the data directly with SQL!** The DataFrame is available as `df`.

        Example queries:
        ```sql
        -- Top referrers
        SELECT referrer, COUNT(*) FROM df GROUP BY 1 ORDER BY 2 DESC LIMIT 10

        -- Hourly traffic pattern
        SELECT hour, COUNT(*) FROM df GROUP BY 1 ORDER BY 1

        -- Sessions with UTM
        SELECT session_id, utm_source, utm_campaign, COUNT(*)
        FROM df WHERE utm_source IS NOT NULL GROUP BY 1,2,3
        ```
        """)

        custom_query = st.text_area(
            "Enter SQL query:",
            value="SELECT event_type, COUNT(*) as count FROM df GROUP BY 1 ORDER BY 2 DESC",
            height=100
        )

        if st.button("Run Query"):
            result = query_with_duckdb(df, custom_query)
            st.dataframe(result)

    # ---------------------------------------------------------------------
    # FOOTER
    # ---------------------------------------------------------------------
    st.markdown("---")
    st.markdown(f"*Data refreshed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
    st.markdown(f"*Total records: {len(df):,}*")


if __name__ == "__main__":
    main()
