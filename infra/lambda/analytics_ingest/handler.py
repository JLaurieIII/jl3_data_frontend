"""
Analytics Ingest Lambda Function

Receives analytics events from API Gateway, validates them,
enriches with server-side data, and sends to Kinesis Data Streams.

When Kinesis is disabled, events are logged to CloudWatch for debugging.
"""

import json
import os
import hashlib
import uuid
from datetime import datetime, timezone

# boto3 is available in Lambda runtime - no need for requirements.txt
import boto3

# Environment variables (set by Terraform)
KINESIS_STREAM_NAME = os.environ.get("KINESIS_STREAM_NAME", "")
KINESIS_ENABLED = os.environ.get("KINESIS_ENABLED", "false").lower() == "true"
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "https://jamesjlaurieiii.com,https://www.jamesjlaurieiii.com")

# Valid properties (websites we track)
VALID_PROPERTIES = {"jamesjlaurieiii"}

# Required fields in event payload
REQUIRED_FIELDS = ["event_id", "event_type", "session_id", "page_path", "property"]

# Kinesis client (initialized lazily)
kinesis_client = None


def get_kinesis_client():
    """Lazy initialization of Kinesis client."""
    global kinesis_client
    if kinesis_client is None:
        kinesis_client = boto3.client("kinesis")
    return kinesis_client


def hash_ip(ip_address):
    """
    Hash IP address for privacy.
    Returns first 16 chars of SHA256 hash.
    """
    if not ip_address:
        return None
    hashed = hashlib.sha256(ip_address.encode()).hexdigest()
    return hashed[:16]


def get_cors_headers(origin=None):
    """Return CORS headers for response."""
    allowed_list = ALLOWED_ORIGINS.split(",")

    # Check if origin is allowed
    if origin and origin in allowed_list:
        allow_origin = origin
    else:
        # Default to first allowed origin
        allow_origin = allowed_list[0] if allowed_list else "*"

    return {
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
    }


def validate_event(event_data):
    """
    Validate event payload.
    Returns (is_valid, error_message).
    """
    # Check required fields
    for field in REQUIRED_FIELDS:
        if field not in event_data or not event_data[field]:
            return False, f"Missing required field: {field}"

    # Validate property against allowlist
    if event_data.get("property") not in VALID_PROPERTIES:
        return False, f"Invalid property: {event_data.get('property')}"

    # Validate event_type is a non-empty string
    event_type = event_data.get("event_type", "")
    if not isinstance(event_type, str) or len(event_type) > 100:
        return False, "Invalid event_type"

    return True, None


def enrich_event(event_data, request_context):
    """
    Add server-side enrichment to event.
    """
    # Server timestamp (UTC ISO format)
    event_data["server_ts"] = datetime.now(timezone.utc).isoformat()

    # Ingest ID (unique ID for this ingest)
    event_data["ingest_id"] = str(uuid.uuid4())

    # Hash client IP for privacy
    source_ip = request_context.get("identity", {}).get("sourceIp")
    event_data["ip_hash"] = hash_ip(source_ip)

    # Remove raw IP if present (shouldn't be, but safety check)
    event_data.pop("ip_address", None)
    event_data.pop("source_ip", None)

    return event_data


def send_to_kinesis(event_data):
    """
    Send event to Kinesis Data Streams.
    Uses session_id as partition key for ordering within session.
    """
    client = get_kinesis_client()

    response = client.put_record(
        StreamName=KINESIS_STREAM_NAME,
        Data=json.dumps(event_data),
        PartitionKey=event_data.get("session_id", "default")
    )

    return response


def lambda_handler(event, context):
    """
    Main Lambda handler.

    Receives events from API Gateway, validates, enriches,
    and forwards to Kinesis (or logs if disabled).
    """
    # Get origin for CORS
    headers = event.get("headers", {}) or {}
    origin = headers.get("origin") or headers.get("Origin")
    cors_headers = get_cors_headers(origin)

    # Handle CORS preflight
    http_method = event.get("httpMethod", "")
    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": ""
        }

    # Parse request body
    try:
        body = event.get("body", "{}")
        if isinstance(body, str):
            event_data = json.loads(body)
        else:
            event_data = body or {}
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Invalid JSON"})
        }

    # Validate event
    is_valid, error_message = validate_event(event_data)
    if not is_valid:
        print(f"Validation failed: {error_message}")
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": error_message})
        }

    # Get request context for enrichment
    request_context = event.get("requestContext", {})

    # Enrich event with server-side data
    enriched_event = enrich_event(event_data, request_context)

    # Log event (always, for debugging)
    print(f"Event received: {json.dumps(enriched_event)}")

    # Send to Kinesis if enabled
    if KINESIS_ENABLED and KINESIS_STREAM_NAME:
        try:
            kinesis_response = send_to_kinesis(enriched_event)
            print(f"Sent to Kinesis: {kinesis_response.get('SequenceNumber')}")
        except Exception as e:
            print(f"Kinesis error: {e}")
            # Return 500 so client can retry
            return {
                "statusCode": 500,
                "headers": cors_headers,
                "body": json.dumps({"error": "Failed to process event"})
            }
    else:
        print("Kinesis disabled - event logged only")

    # Success response
    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({
            "status": "ok",
            "ingest_id": enriched_event.get("ingest_id")
        })
    }
