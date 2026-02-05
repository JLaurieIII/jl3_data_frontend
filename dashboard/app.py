"""
Analytics Dashboard for jamesjlaurieiii.com - Watch Me Watch You Campaign

This dashboard uses DuckDB to query analytics data from S3 and displays
it using Streamlit. Features senior analyst-level visualizations including
conversion funnels, source comparison, and real-time indicators.

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
import os

# =============================================================================
# CONFIGURATION
# =============================================================================

S3_BUCKET = "jl3-static-site-analytics-data"
S3_PREFIX = "raw/"

# For Streamlit Cloud deployment, use secrets; for local, use profile
try:
    AWS_ACCESS_KEY_ID = st.secrets["aws"]["access_key_id"]
    AWS_SECRET_ACCESS_KEY = st.secrets["aws"]["secret_access_key"]
    AWS_REGION = st.secrets["aws"].get("region", "us-east-1")
    USE_SECRETS = True
except Exception:
    AWS_PROFILE = "terraform-admin"
    USE_SECRETS = False

# Branded color palette
COLORS = {
    "teal": "#14b8a6",
    "teal_light": "#5eead4",
    "teal_dark": "#0d9488",
    "dark": "#0f1419",
    "dark_secondary": "#1a2332",
    "dark_tertiary": "#2a3544",
    "light": "#faf9f7",
    "light_secondary": "#f0eeea",
    "text_light": "#6b7280",
    "success": "#10b981",
    "warning": "#f59e0b",
    "error": "#ef4444",
}

# Funnel stages in order
FUNNEL_STAGES = [
    ("page_view", "Page View"),
    ("scroll_depth", "Scrolled 50%+"),
    ("cta_click", "CTA Click"),
    ("form_submit", "Form Submit"),
]

# =============================================================================
# PAGE CONFIG
# =============================================================================

# Check for embed mode via query params
query_params = st.query_params
embed_mode = query_params.get("embed", "false").lower() == "true"

st.set_page_config(
    page_title="JL3 Analytics Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed" if embed_mode else "expanded"
)

# =============================================================================
# CUSTOM STYLING
# =============================================================================

st.markdown(f"""
<style>
    /* Hide Streamlit branding in embed mode */
    {"#MainMenu, footer, header {visibility: hidden;}" if embed_mode else ""}

    /* Branded colors */
    .stMetric > div > div > div > div {{
        color: {COLORS['teal']};
    }}

    /* Live indicator pulse */
    @keyframes pulse {{
        0% {{ opacity: 1; }}
        50% {{ opacity: 0.5; }}
        100% {{ opacity: 1; }}
    }}

    .live-indicator {{
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        background: {COLORS['dark']};
        color: {COLORS['light']};
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
    }}

    .live-dot {{
        width: 8px;
        height: 8px;
        background: {COLORS['success']};
        border-radius: 50%;
        animation: pulse 2s infinite;
    }}

    /* Funnel container */
    .funnel-stage {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        margin: 4px 0;
        border-radius: 8px;
        font-weight: 500;
    }}

    .funnel-count {{
        font-family: monospace;
        font-size: 18px;
    }}

    /* Source comparison table */
    .dataframe {{
        font-size: 14px;
    }}

    /* Campaign filter pills */
    .stMultiSelect > div > div > div {{
        background-color: {COLORS['light_secondary']};
    }}
</style>
""", unsafe_allow_html=True)

# =============================================================================
# DATA LOADING
# =============================================================================

@st.cache_data(ttl=60)  # Cache for 1 minute for more real-time feel
def load_data_from_s3():
    """
    Download and parse analytics data from S3.
    """
    try:
        # Create S3 client
        if USE_SECRETS:
            s3 = boto3.client(
                's3',
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION
            )
        else:
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
                except Exception:
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
# HELPER FUNCTIONS
# =============================================================================

def get_funnel_data(df, campaign_filter=None, date_range=None):
    """Calculate conversion funnel metrics."""
    filtered_df = df.copy()

    if campaign_filter:
        filtered_df = filtered_df[filtered_df['utm_campaign'].isin(campaign_filter)]

    if date_range and len(date_range) == 2:
        filtered_df = filtered_df[
            (filtered_df['date'] >= date_range[0]) &
            (filtered_df['date'] <= date_range[1])
        ]

    funnel_data = []
    total_sessions = filtered_df['session_id'].nunique() if 'session_id' in filtered_df.columns else 0

    for event_type, label in FUNNEL_STAGES:
        if event_type == "scroll_depth":
            # Count sessions with scroll_depth >= 50
            if 'event_type' in filtered_df.columns and 'depth_percent' in filtered_df.columns:
                scroll_events = filtered_df[
                    (filtered_df['event_type'] == 'scroll_depth') &
                    (filtered_df['depth_percent'].fillna(0).astype(float) >= 50)
                ]
                count = scroll_events['session_id'].nunique()
            else:
                count = 0
        else:
            if 'event_type' in filtered_df.columns:
                count = filtered_df[filtered_df['event_type'] == event_type]['session_id'].nunique()
            else:
                count = 0

        rate = (count / total_sessions * 100) if total_sessions > 0 else 0
        funnel_data.append({
            "stage": label,
            "count": count,
            "rate": rate
        })

    return funnel_data


def get_source_comparison(df, campaign_filter=None):
    """Get engagement metrics by source."""
    filtered_df = df.copy()

    if campaign_filter:
        filtered_df = filtered_df[filtered_df['utm_campaign'].isin(campaign_filter)]

    if filtered_df.empty or 'utm_source' not in filtered_df.columns:
        return pd.DataFrame()

    query = """
        WITH session_metrics AS (
            SELECT
                session_id,
                COALESCE(CAST(utm_source AS VARCHAR), '(direct)') as source,
                COUNT(*) as events_per_session,
                MAX(CASE WHEN event_type = 'scroll_depth' THEN CAST(depth_percent AS INTEGER) ELSE 0 END) as max_scroll
            FROM filtered_df
            GROUP BY session_id, utm_source
        ),
        source_agg AS (
            SELECT
                source,
                COUNT(DISTINCT session_id) as sessions,
                ROUND(AVG(events_per_session), 1) as avg_events,
                ROUND(AVG(max_scroll), 0) as avg_scroll_depth
            FROM session_metrics
            GROUP BY source
        )
        SELECT * FROM source_agg
        ORDER BY sessions DESC
        LIMIT 10
    """

    return query_with_duckdb(filtered_df, query)


def get_scroll_depth_distribution(df, campaign_filter=None):
    """Get scroll depth distribution."""
    filtered_df = df.copy()

    if campaign_filter:
        filtered_df = filtered_df[filtered_df['utm_campaign'].isin(campaign_filter)]

    if filtered_df.empty or 'event_type' not in filtered_df.columns:
        return pd.DataFrame()

    scroll_df = filtered_df[filtered_df['event_type'] == 'scroll_depth']

    if scroll_df.empty or 'depth_percent' not in scroll_df.columns:
        return pd.DataFrame()

    query = """
        SELECT
            CAST(depth_percent AS INTEGER) as depth,
            COUNT(DISTINCT session_id) as sessions
        FROM scroll_df
        GROUP BY depth_percent
        ORDER BY depth
    """

    return query_with_duckdb(scroll_df, query)


def calculate_session_metrics(df, campaign_filter=None):
    """Calculate bounce rate and pages per session."""
    filtered_df = df.copy()

    if campaign_filter:
        filtered_df = filtered_df[filtered_df['utm_campaign'].isin(campaign_filter)]

    if filtered_df.empty or 'session_id' not in filtered_df.columns:
        return {"bounce_rate": 0, "pages_per_session": 0, "avg_session_duration": 0}

    # Pages per session
    page_views = filtered_df[filtered_df['event_type'] == 'page_view'] if 'event_type' in filtered_df.columns else filtered_df
    pages_per_session = page_views.groupby('session_id').size()
    avg_pages = pages_per_session.mean() if len(pages_per_session) > 0 else 0

    # Bounce rate (sessions with only 1 event)
    events_per_session = filtered_df.groupby('session_id').size()
    bounces = (events_per_session == 1).sum()
    total_sessions = len(events_per_session)
    bounce_rate = (bounces / total_sessions * 100) if total_sessions > 0 else 0

    return {
        "bounce_rate": round(bounce_rate, 1),
        "pages_per_session": round(avg_pages, 1),
    }


# =============================================================================
# DASHBOARD UI
# =============================================================================

def main():
    # Load data
    with st.spinner("Loading data from S3..."):
        df = load_data_from_s3()

    # Sidebar filters
    if not embed_mode:
        st.sidebar.header("📊 Dashboard Filters")

        # Refresh button
        if st.sidebar.button("🔄 Refresh Data"):
            st.cache_data.clear()
            st.rerun()

    # Date range filter
    if not df.empty and 'date' in df.columns:
        min_date = df['date'].min()
        max_date = df['date'].max()

        if not embed_mode:
            date_range = st.sidebar.date_input(
                "Date Range",
                value=(min_date, max_date),
                min_value=min_date,
                max_value=max_date
            )
        else:
            date_range = (min_date, max_date)
    else:
        date_range = None

    # Campaign filter
    campaigns = []
    if not df.empty and 'utm_campaign' in df.columns:
        campaigns = df['utm_campaign'].dropna().unique().tolist()

    if not embed_mode and campaigns:
        selected_campaigns = st.sidebar.multiselect(
            "Campaign",
            options=campaigns,
            default=["watch_me_watch_you"] if "watch_me_watch_you" in campaigns else None
        )
    else:
        # In embed mode, default to watch_me_watch_you campaign
        selected_campaigns = ["watch_me_watch_you"] if "watch_me_watch_you" in campaigns else None

    # Apply filters
    filtered_df = df.copy()
    if selected_campaigns:
        filtered_df = filtered_df[filtered_df['utm_campaign'].isin(selected_campaigns)]
    if date_range and len(date_range) == 2 and 'date' in filtered_df.columns:
        filtered_df = filtered_df[
            (filtered_df['date'] >= date_range[0]) &
            (filtered_df['date'] <= date_range[1])
        ]

    # Header with live indicator
    col1, col2 = st.columns([3, 1])
    with col1:
        if embed_mode:
            st.markdown("### 📊 Live Campaign Analytics")
        else:
            st.title("📊 JL3 Analytics Dashboard")
            st.markdown("*Watch Me Watch You* campaign analytics")

    with col2:
        if not df.empty and 'event_ts' in df.columns:
            last_event = df['event_ts'].max()
            if pd.notna(last_event):
                st.markdown(f"""
                <div class="live-indicator">
                    <span class="live-dot"></span>
                    Last event: {last_event.strftime('%H:%M:%S')}
                </div>
                """, unsafe_allow_html=True)

    if df.empty:
        st.warning("No data found yet. Visit your site to generate some events!")
        st.info("""
        **How data flows:**
        1. You visit jamesjlaurieiii.com
        2. analytics.js sends events to API Gateway
        3. Lambda validates and sends to Kinesis
        4. Firehose batches and writes to S3 (every 5 min or 128MB)
        5. This dashboard reads from S3
        """)
        return

    # ---------------------------------------------------------------------
    # KEY METRICS ROW
    # ---------------------------------------------------------------------
    st.markdown("---")

    session_metrics = calculate_session_metrics(filtered_df, selected_campaigns)

    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        total_sessions = filtered_df['session_id'].nunique() if 'session_id' in filtered_df.columns else 0
        st.metric("Sessions", f"{total_sessions:,}")

    with col2:
        page_views = len(filtered_df[filtered_df['event_type'] == 'page_view']) if 'event_type' in filtered_df.columns else 0
        st.metric("Page Views", f"{page_views:,}")

    with col3:
        st.metric("Bounce Rate", f"{session_metrics['bounce_rate']}%")

    with col4:
        st.metric("Pages/Session", f"{session_metrics['pages_per_session']}")

    with col5:
        form_submits = len(filtered_df[filtered_df['event_type'] == 'form_submit']) if 'event_type' in filtered_df.columns else 0
        st.metric("Form Submits", f"{form_submits:,}")

    # ---------------------------------------------------------------------
    # CONVERSION FUNNEL
    # ---------------------------------------------------------------------
    st.markdown("---")
    st.subheader("🔄 Conversion Funnel")

    funnel_data = get_funnel_data(filtered_df, selected_campaigns, date_range)

    if funnel_data:
        # Create funnel visualization
        fig = go.Figure()

        stages = [d["stage"] for d in funnel_data]
        counts = [d["count"] for d in funnel_data]
        rates = [d["rate"] for d in funnel_data]

        fig.add_trace(go.Funnel(
            y=stages,
            x=counts,
            textposition="inside",
            textinfo="value+percent initial",
            opacity=0.85,
            marker={
                "color": [COLORS["teal"], COLORS["teal_light"], COLORS["warning"], COLORS["success"]],
                "line": {"width": 2, "color": COLORS["dark"]}
            },
            connector={"line": {"color": COLORS["dark_tertiary"], "width": 2}}
        ))

        fig.update_layout(
            height=300,
            margin=dict(l=20, r=20, t=20, b=20),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
        )

        st.plotly_chart(fig, use_container_width=True)

        # Conversion rates
        if len(funnel_data) >= 2:
            col1, col2, col3 = st.columns(3)
            with col1:
                view_to_scroll = (funnel_data[1]["count"] / funnel_data[0]["count"] * 100) if funnel_data[0]["count"] > 0 else 0
                st.metric("View → Scroll", f"{view_to_scroll:.1f}%")
            with col2:
                scroll_to_click = (funnel_data[2]["count"] / funnel_data[1]["count"] * 100) if funnel_data[1]["count"] > 0 else 0
                st.metric("Scroll → Click", f"{scroll_to_click:.1f}%")
            with col3:
                click_to_submit = (funnel_data[3]["count"] / funnel_data[2]["count"] * 100) if funnel_data[2]["count"] > 0 else 0
                st.metric("Click → Submit", f"{click_to_submit:.1f}%")

    # ---------------------------------------------------------------------
    # SOURCE COMPARISON & SCROLL DEPTH
    # ---------------------------------------------------------------------
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("📊 Source Comparison")
        source_data = get_source_comparison(filtered_df, selected_campaigns)

        if not source_data.empty:
            # Style the dataframe
            st.dataframe(
                source_data.rename(columns={
                    "source": "Source",
                    "sessions": "Sessions",
                    "avg_events": "Avg Events",
                    "avg_scroll_depth": "Avg Scroll %"
                }),
                use_container_width=True,
                hide_index=True
            )
        else:
            st.info("No source data available")

    with col2:
        st.subheader("📜 Scroll Depth Distribution")
        scroll_data = get_scroll_depth_distribution(filtered_df, selected_campaigns)

        if not scroll_data.empty:
            fig = px.bar(
                scroll_data,
                x="depth",
                y="sessions",
                color_discrete_sequence=[COLORS["teal"]]
            )
            fig.update_layout(
                xaxis_title="Scroll Depth %",
                yaxis_title="Sessions",
                height=300,
                margin=dict(l=20, r=20, t=20, b=40),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
            )
            fig.update_xaxes(tickvals=[25, 50, 75, 100])
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No scroll data available")

    # ---------------------------------------------------------------------
    # TRAFFIC ANALYSIS (only in non-embed mode)
    # ---------------------------------------------------------------------
    if not embed_mode:
        st.markdown("---")
        st.subheader("📈 Traffic Analysis")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Events by Type**")
            if 'event_type' in filtered_df.columns:
                event_counts = query_with_duckdb(filtered_df, """
                    SELECT event_type, COUNT(*) as count
                    FROM filtered_df
                    GROUP BY event_type
                    ORDER BY count DESC
                """)
                if not event_counts.empty:
                    fig = px.pie(
                        event_counts,
                        values='count',
                        names='event_type',
                        color_discrete_sequence=[COLORS["teal"], COLORS["teal_light"], COLORS["warning"], COLORS["success"], COLORS["dark_tertiary"]]
                    )
                    fig.update_layout(
                        height=300,
                        margin=dict(l=20, r=20, t=20, b=20),
                    )
                    st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("**Top Pages**")
            if 'page_path' in filtered_df.columns:
                page_counts = query_with_duckdb(filtered_df, """
                    SELECT page_path, COUNT(*) as views
                    FROM filtered_df
                    WHERE event_type = 'page_view'
                    GROUP BY page_path
                    ORDER BY views DESC
                    LIMIT 10
                """)
                if not page_counts.empty:
                    fig = px.bar(
                        page_counts,
                        x='views',
                        y='page_path',
                        orientation='h',
                        color_discrete_sequence=[COLORS["teal"]]
                    )
                    fig.update_layout(
                        yaxis={'categoryorder': 'total ascending'},
                        height=300,
                        margin=dict(l=20, r=20, t=20, b=20),
                        xaxis_title="Views",
                        yaxis_title=""
                    )
                    st.plotly_chart(fig, use_container_width=True)

        # ---------------------------------------------------------------------
        # TIMELINE
        # ---------------------------------------------------------------------
        st.markdown("---")
        st.subheader("📅 Events Over Time")

        if 'event_ts' in filtered_df.columns and 'date' in filtered_df.columns:
            daily_counts = query_with_duckdb(filtered_df, """
                SELECT
                    date,
                    COUNT(*) as events,
                    COUNT(DISTINCT session_id) as sessions
                FROM filtered_df
                GROUP BY date
                ORDER BY date
            """)
            if not daily_counts.empty:
                fig = go.Figure()
                fig.add_trace(go.Scatter(
                    x=daily_counts['date'],
                    y=daily_counts['events'],
                    mode='lines+markers',
                    name='Events',
                    line=dict(color=COLORS["teal"], width=2),
                    marker=dict(size=8)
                ))
                fig.add_trace(go.Scatter(
                    x=daily_counts['date'],
                    y=daily_counts['sessions'],
                    mode='lines+markers',
                    name='Sessions',
                    line=dict(color=COLORS["warning"], width=2),
                    marker=dict(size=8)
                ))
                fig.update_layout(
                    xaxis_title='Date',
                    yaxis_title='Count',
                    height=300,
                    margin=dict(l=20, r=20, t=20, b=40),
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
                )
                st.plotly_chart(fig, use_container_width=True)

        # ---------------------------------------------------------------------
        # RAW DATA & SQL PLAYGROUND
        # ---------------------------------------------------------------------
        st.markdown("---")
        st.subheader("🔍 Data Explorer")

        with st.expander("View Raw Data"):
            st.dataframe(filtered_df.head(100))

        with st.expander("SQL Playground (DuckDB)"):
            st.markdown("""
            **Query the data directly with SQL!** The DataFrame is available as `filtered_df`.
            """)

            custom_query = st.text_area(
                "Enter SQL query:",
                value="SELECT event_type, COUNT(*) as count FROM filtered_df GROUP BY 1 ORDER BY 2 DESC",
                height=100
            )

            if st.button("Run Query"):
                result = query_with_duckdb(filtered_df, custom_query)
                st.dataframe(result)

    # ---------------------------------------------------------------------
    # FOOTER
    # ---------------------------------------------------------------------
    if not embed_mode:
        st.markdown("---")
        st.markdown(f"*Data refreshed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        st.markdown(f"*Total records: {len(filtered_df):,}*")


if __name__ == "__main__":
    main()
