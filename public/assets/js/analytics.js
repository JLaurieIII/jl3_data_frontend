/**
 * Analytics Tracking Pixel for jamesjlaurieiii.com
 *
 * WHAT THIS FILE DOES:
 * - Tracks page views (when someone visits a page)
 * - Tracks button clicks (like "Book a Call")
 * - Captures UTM parameters (how they found you - LinkedIn, Twitter, etc.)
 * - Sends all this data to our API for storage
 *
 * HOW IT WORKS:
 * 1. When the page loads, this script runs automatically
 * 2. It creates a "session" (a unique ID for this visitor's browsing session)
 * 3. It watches for events (page views, clicks)
 * 4. It packages event data as JSON and sends it to our API
 */

// ============================================================================
// PART 1: CREATE A NAMESPACE
// ============================================================================
//
// WHAT IS A NAMESPACE?
// Think of it like putting all your stuff in a labeled box.
// Instead of leaving variables scattered everywhere (which could
// accidentally overwrite other scripts), we put everything inside
// one object called "JL3Analytics".
//
// WHY DO WE DO THIS?
// Your website might load other JavaScript (like a chat widget, or
// Google Analytics). If we just created a variable called "sessionId",
// another script might also have a "sessionId" and they'd fight.
// By putting ours inside JL3Analytics.sessionId, it's protected.
//
// ANALOGY:
// Imagine a shared refrigerator at work. If everyone just puts their
// lunch on any shelf, things get lost or taken. But if everyone has
// their own labeled container, no confusion. JL3Analytics is our container.

var JL3Analytics = JL3Analytics || {};

// ^^^ WHAT DOES THIS LINE MEAN? ^^^
//
// "var JL3Analytics" - Create a variable called JL3Analytics
// "JL3Analytics || {}" - If JL3Analytics already exists, use it.
//                        Otherwise, create an empty object {}.
//
// The "||" means "or". So it's saying:
// "Use the existing JL3Analytics OR create a new empty one"
//
// This prevents errors if the script accidentally loads twice.

// ============================================================================
// PART 2: CONFIGURATION
// ============================================================================
//
// WHAT IS CONFIGURATION?
// These are settings that control how our script behaves.
// Think of it like the settings on your phone - you can change
// the volume, brightness, etc. without rebuilding the phone.
//
// WHY SEPARATE SETTINGS FROM CODE?
// Imagine you want to change where we send data. Would you rather:
//   A) Search through 200 lines of code to find the URL
//   B) Look at the top of the file where all settings are listed
//
// Option B is way easier. That's why we put settings up top.
//
// ANALOGY:
// It's like a recipe that lists ingredients at the top. You can
// easily see "oh, I need 2 cups of flour" without reading the
// whole recipe. Settings at top = ingredients list.

JL3Analytics.config = {

    // WHERE TO SEND THE DATA
    // API Gateway endpoint for analytics ingestion.
    // Set to null for local development (logs to console only).
    //
    // IMPORTANT: After terraform apply, update this with the output:
    // terraform output analytics_api_endpoint
    endpoint: "https://jdsbdf3t47.execute-api.us-east-1.amazonaws.com/v1/events",

    // WHICH WEBSITE IS THIS?
    // You might track multiple sites someday. This label helps us know
    // which site the data came from.
    property: "jamesjlaurieiii",

    // DEBUG MODE
    // When true: prints detailed messages to browser console (for testing)
    // When false: runs silently (for production)
    //
    // Set to false for production deployment.
    debug: false,

    // SESSION TIMEOUT (in minutes)
    // If someone leaves your site and comes back 45 minutes later,
    // should we count that as the same visit or a new visit?
    //
    // 30 minutes is the industry standard (same as Google Analytics).
    // After 30 min of no activity, we consider it a new session.
    sessionTimeoutMinutes: 30,

    // STORAGE KEY
    // We store the session ID in the browser's localStorage.
    // This is the "key" (like a label) we use to find it.
    //
    // Think of localStorage like a tiny database in the browser.
    // We're saying "store our session under the name 'jl3_analytics_session'"
    storageKey: "jl3_analytics_session"
};

// ============================================================================
// PART 3: UTILITY FUNCTIONS (Our Toolbox!)
// ============================================================================
//
// WHAT IS A FUNCTION?
// A function is like a little machine. You put something in, it does work,
// and something comes out.
//
// Real-world example: A toaster!
//   - INPUT: bread
//   - PROCESS: apply heat for 2 minutes
//   - OUTPUT: toast
//
// In code:
//   - INPUT: parameters (values you pass in)
//   - PROCESS: the code inside the function
//   - OUTPUT: the return value
//
// WHY USE FUNCTIONS?
// Imagine you need to make toast 100 times. Would you rather:
//   A) Write out "apply heat for 2 minutes" 100 times
//   B) Just say "use the toaster" 100 times
//
// Functions let us write code ONCE and use it many times.
// DRY = "Don't Repeat Yourself" - a golden rule in programming!

// ----------------------------------------------------------------------------
// FUNCTION 1: Generate a UUID (Unique ID)
// ----------------------------------------------------------------------------
//
// WHAT IS A UUID?
// UUID stands for "Universally Unique Identifier"
// It's a random string that looks like: "550e8400-e29b-41d4-a716-446655440000"
//
// WHY DO WE NEED THIS?
// When 3 people visit your site at the same time, how do we tell them apart?
// We give each one a unique ID - like a wristband at a concert.
//
// Person A gets: "abc-123-def"
// Person B gets: "xyz-789-ghi"
// Person C gets: "mno-456-pqr"
//
// Now when we see an event, we know EXACTLY who did it!
//
// HOW UNIQUE IS IT?
// There are 340 undecillion possible UUIDs (that's 340 followed by 36 zeros).
// You could generate 1 billion UUIDs per second for 100 years and probably
// never get a duplicate. It's THAT unique.
//
// FUN FACT: UUID is used everywhere - your iPhone has one, every row in
// most databases has one, every Amazon order has one.

JL3Analytics.generateUUID = function() {
    // This is a well-known pattern for generating UUID v4 (random-based)
    //
    // THE PATTERN: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    // Each 'x' gets replaced with a random hex digit (0-9 or a-f)
    // The '4' stays as 4 (indicates this is a "version 4" UUID)
    // The 'y' gets replaced with 8, 9, a, or b (it's a UUID rule)
    //
    // WHAT'S A HEX DIGIT?
    // Normal digits: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 (10 options)
    // Hex digits: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, a, b, c, d, e, f (16 options)
    // Hex is used because it's compact - you can represent more with fewer characters

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        // ^^^ This says: "Find every 'x' and 'y' in the pattern and replace them"
        //
        // Let's break down what happens for EACH character:

        // Step 1: Generate a random number from 0-15
        var r = Math.random() * 16 | 0;
        // ^^^ Math.random() gives 0.0 to 0.999...
        //     Multiply by 16 gives 0.0 to 15.999...
        //     The "| 0" chops off decimals (so we get 0, 1, 2... 15)

        // Step 2: If it's 'x', use the random number. If it's 'y', do special math.
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        // ^^^ For 'y', we use bitwise math to ensure it's 8, 9, a, or b
        //     (Don't worry about the details - it's just following the UUID spec)

        // Step 3: Convert the number to a hex character and return it
        return v.toString(16);
        // ^^^ .toString(16) converts: 0-9 stay as "0"-"9", 10-15 become "a"-"f"
    });
};

// LET'S TEST IT!
// If you open browser console and type: JL3Analytics.generateUUID()
// You'll get something like: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
// Run it again: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
// Every time = different! That's the magic of randomness.

// ----------------------------------------------------------------------------
// FUNCTION 2: Debug Logger
// ----------------------------------------------------------------------------
//
// WHAT DOES THIS DO?
// It's a "smart" console.log that only prints when debug mode is ON.
//
// WHY NOT JUST USE console.log()?
// When your site is live, you don't want visitors seeing debug messages
// in their browser console. It looks unprofessional and leaks info.
//
// With this function:
//   - debug: true  → messages appear (for development)
//   - debug: false → messages hidden (for production)
//
// It's like a light switch for all your debug messages at once!

JL3Analytics.log = function(message, data) {
    // Only print if debug mode is enabled in config
    if (JL3Analytics.config.debug) {
        // If we have extra data to show, include it
        if (data !== undefined) {
            console.log('[JL3 Analytics]', message, data);
        } else {
            console.log('[JL3 Analytics]', message);
        }
    }
    // If debug is false, this function does nothing (silent)
};

// USAGE EXAMPLES:
// JL3Analytics.log("Page loaded");
//   → Prints: [JL3 Analytics] Page loaded
//
// JL3Analytics.log("Event captured", {type: "click", button: "cta"});
//   → Prints: [JL3 Analytics] Event captured {type: "click", button: "cta"}
//
// The "[JL3 Analytics]" prefix helps you find YOUR messages among
// all the other stuff in the console. It's like a name tag!

// ----------------------------------------------------------------------------
// FUNCTION 3: Get UTM Parameters (Marketing Attribution Magic!)
// ----------------------------------------------------------------------------
//
// FIRST, LET'S UNDERSTAND URLs!
// =============================
// A URL is like an address for the internet. Let's dissect one:
//
//   https://jamesjlaurieiii.com/case-studies/duffdash.html?utm_source=linkedin&utm_campaign=launch
//   |___|   |_________________||________________________||___________________________________|
//     |            |                    |                              |
//  Protocol     Domain               Path                      Query String
//  (https)   (your site)         (which page)              (extra info after ?)
//
// THE QUERY STRING (everything after the ?)
// ==========================================
// The "?" marks the start of the query string.
// It contains key=value pairs separated by "&"
//
// Example: ?utm_source=linkedin&utm_campaign=launch
//          |_________________| |__________________|
//                 |                    |
//          First pair              Second pair
//          key: utm_source         key: utm_campaign
//          value: linkedin         value: launch
//
// WHAT ARE UTM PARAMETERS?
// ========================
// UTM = "Urchin Tracking Module" (named after a company Google bought)
//
// They're special query parameters that marketers use to track WHERE
// traffic comes from. There are 5 standard UTM parameters:
//
//   utm_source   = WHERE did they come from? (linkedin, twitter, google)
//   utm_medium   = WHAT TYPE of link? (social, email, cpc, organic)
//   utm_campaign = WHICH campaign? (spring_sale, product_launch, duffdash)
//   utm_content  = WHICH specific link? (header_link, footer_link, post_1)
//   utm_term     = WHICH keyword? (used mainly for paid search ads)
//
// REAL WORLD EXAMPLE:
// ===================
// You post on LinkedIn about your DuffDash case study. You use this link:
//
//   https://jamesjlaurieiii.com/case-studies/duffdash.html
//     ?utm_source=linkedin
//     &utm_medium=social
//     &utm_campaign=duffdash_launch
//     &utm_content=post_jan_24
//
// When someone clicks it, our code captures ALL of that!
// Later, you can see: "14 people came from that LinkedIn post!"
//
// WHY IS THIS POWERFUL?
// =====================
// Without UTM tracking:
//   "I got 50 visitors today... from somewhere?"
//
// With UTM tracking:
//   "I got 50 visitors today:
//    - 25 from LinkedIn (duffdash post)
//    - 15 from Twitter (data engineering thread)
//    - 10 from Reddit (r/dataengineering)"
//
// Now you know WHERE to spend your marketing time!

JL3Analytics.getUTMParameters = function() {
    // Create an empty object to store the UTM values we find
    var utmParams = {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_content: null,
        utm_term: null
    };

    // STEP 1: Get the query string from the current URL
    // =================================================
    // window.location.search gives us everything after the "?" in the URL
    //
    // If URL is: https://example.com/page?name=james&age=30
    // Then window.location.search = "?name=james&age=30"
    //
    // If there's no "?", it returns an empty string ""

    var queryString = window.location.search;

    // If there's no query string, return empty UTM params
    if (!queryString) {
        return utmParams;
    }

    // STEP 2: Remove the leading "?" character
    // ========================================
    // "?utm_source=linkedin" becomes "utm_source=linkedin"
    // The .substring(1) means "give me everything starting at position 1"
    // (Position 0 is the "?", position 1 is "u", etc.)

    queryString = queryString.substring(1);

    // STEP 3: Split by "&" to get individual pairs
    // =============================================
    // "utm_source=linkedin&utm_campaign=launch"
    // becomes
    // ["utm_source=linkedin", "utm_campaign=launch"]
    //
    // .split("&") chops the string wherever it sees "&"

    var pairs = queryString.split('&');

    // STEP 4: Loop through each pair and extract UTM values
    // ======================================================
    // For each pair like "utm_source=linkedin":
    //   - Split by "=" to get ["utm_source", "linkedin"]
    //   - Check if the key starts with "utm_"
    //   - If yes, save it to our utmParams object

    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        // pair[0] = the key (e.g., "utm_source")
        // pair[1] = the value (e.g., "linkedin")

        var key = pair[0];
        // decodeURIComponent handles special characters
        // If someone types a space in a URL, it becomes "%20"
        // decodeURIComponent("%20") → " " (a space)
        var value = pair[1] ? decodeURIComponent(pair[1]) : null;

        // Only save if it's one of our UTM parameters
        if (key in utmParams) {
            utmParams[key] = value;
        }
    }

    return utmParams;
};

// TEST IT YOURSELF!
// =================
// 1. Open your site with UTM params:
//    http://localhost:8000/?utm_source=test&utm_campaign=my_campaign
//
// 2. Open browser console (F12)
//
// 3. Type: JL3Analytics.getUTMParameters()
//
// 4. You should see:
//    {
//      utm_source: "test",
//      utm_medium: null,
//      utm_campaign: "my_campaign",
//      utm_content: null,
//      utm_term: null
//    }
//
// The function found "test" and "my_campaign" but the others weren't
// in the URL, so they're null. Perfect!

// ============================================================================
// PART 4: SESSION MANAGEMENT (The Visitor Wristband System!)
// ============================================================================
//
// WHAT IS A SESSION?
// ==================
// A session is ONE VISIT to your website. It includes everything a person
// does from when they arrive until they leave (or go inactive).
//
// Think of it like visiting a theme park:
//   - You arrive → session starts, you get a wristband (session ID)
//   - You ride rides, eat food, take photos → all tracked under your wristband
//   - You leave (or sit idle for 30 min) → session ends
//   - You come back tomorrow → NEW wristband, new session
//
// WHY DO WE NEED SESSIONS?
// ========================
// Without sessions, every event looks isolated:
//   Event 1: page_view on /home
//   Event 2: page_view on /case-studies
//   Event 3: click on "Book a Call"
//
// We don't know if that's ONE person doing 3 things, or THREE people
// each doing 1 thing!
//
// With sessions:
//   Event 1: page_view on /home         [session: abc-123]
//   Event 2: page_view on /case-studies [session: abc-123]
//   Event 3: click on "Book a Call"     [session: abc-123]
//
// NOW we know: "One person viewed home, then case studies, then clicked CTA!"
// That's a CONVERSION FUNNEL. Gold for understanding user behavior.
//
// WHAT IS localStorage?
// =====================
// Every browser has a tiny database called localStorage. It's like a
// sticky note that stays in the browser even after you close it.
//
// We can:
//   - SAVE data:   localStorage.setItem("name", "James")
//   - READ data:   localStorage.getItem("name")  → "James"
//   - DELETE data: localStorage.removeItem("name")
//
// It's per-website, so your data on jamesjlaurieiii.com is separate
// from data on google.com. They can't see each other.
//
// LIMITS:
//   - Only stores strings (we'll convert objects to JSON)
//   - ~5MB limit per site (more than enough for us)
//   - User can clear it (but that's rare)
//
// OUR SESSION STRATEGY:
// =====================
// We store a session object in localStorage:
// {
//   "sessionId": "abc-123-def-456",     ← Unique ID for this session
//   "createdAt": 1706140800000,          ← When session started (timestamp)
//   "lastActivity": 1706141400000,       ← Last time they did something
//   "utmParams": { ... }                 ← UTM params from when they arrived
// }
//
// On each page load, we check:
//   1. Do they have a session stored?
//   2. If yes, has it been more than 30 minutes since last activity?
//      - If expired → create NEW session
//      - If still valid → use existing session, update lastActivity
//   3. If no session exists → create NEW session

// ----------------------------------------------------------------------------
// FUNCTION: Get or Create Session
// ----------------------------------------------------------------------------
//
// This is the MAIN function for session management.
// It either retrieves an existing valid session OR creates a new one.

JL3Analytics.getOrCreateSession = function() {
    var config = JL3Analytics.config;
    var storageKey = config.storageKey;

    // STEP 1: Try to get existing session from localStorage
    // =====================================================
    var storedSession = null;

    try {
        // localStorage.getItem returns a STRING (or null if not found)
        var storedData = localStorage.getItem(storageKey);

        if (storedData) {
            // JSON.parse converts a string back into an object
            // '{"name":"James"}' → {name: "James"}
            storedSession = JSON.parse(storedData);
        }
    } catch (e) {
        // If localStorage is blocked (private browsing) or corrupted,
        // we'll just create a new session. No big deal!
        JL3Analytics.log("Could not read from localStorage", e);
    }

    // STEP 2: Check if session exists AND is still valid (not expired)
    // =================================================================
    var now = Date.now();
    // ^^^ Date.now() gives current time in milliseconds since Jan 1, 1970
    //     Example: 1706140800000 (a big number, but computers love it)

    var timeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    // ^^^ Convert minutes to milliseconds
    //     30 minutes × 60 seconds × 1000 ms = 1,800,000 ms

    if (storedSession && storedSession.lastActivity) {
        var timeSinceLastActivity = now - storedSession.lastActivity;

        if (timeSinceLastActivity < timeoutMs) {
            // SESSION IS STILL VALID!
            // Update the lastActivity timestamp (they're active now)
            storedSession.lastActivity = now;

            // Save the updated session back to localStorage
            JL3Analytics.saveSession(storedSession);

            JL3Analytics.log("Existing session found", storedSession.sessionId);
            return storedSession;
        } else {
            // Session expired (more than 30 min since last activity)
            JL3Analytics.log("Session expired, creating new one");
        }
    }

    // STEP 3: Create a brand new session
    // ===================================
    // Either no session existed, or it was expired

    var newSession = {
        sessionId: JL3Analytics.generateUUID(),    // Fresh unique ID!
        createdAt: now,                             // Right now
        lastActivity: now,                          // Right now
        utmParams: JL3Analytics.getUTMParameters() // Capture UTM from URL
    };

    // Save it to localStorage for next page load
    JL3Analytics.saveSession(newSession);

    JL3Analytics.log("New session created", newSession.sessionId);
    return newSession;
};

// ----------------------------------------------------------------------------
// HELPER FUNCTION: Save Session to localStorage
// ----------------------------------------------------------------------------
//
// This is a small helper that handles saving and error catching.
// We made it a separate function because we call it from multiple places.

JL3Analytics.saveSession = function(session) {
    try {
        // JSON.stringify converts an object to a string
        // {name: "James"} → '{"name":"James"}'
        //
        // localStorage can ONLY store strings, so we must convert!
        var sessionString = JSON.stringify(session);
        localStorage.setItem(JL3Analytics.config.storageKey, sessionString);
    } catch (e) {
        // Private browsing mode or storage full - not much we can do
        JL3Analytics.log("Could not save session to localStorage", e);
    }
};

// ----------------------------------------------------------------------------
// HELPER FUNCTION: Get Current Session (without creating new one)
// ----------------------------------------------------------------------------
//
// Sometimes we just want to READ the current session without the
// side effects of creating a new one. This is useful for checking
// session state.

JL3Analytics.getCurrentSession = function() {
    try {
        var storedData = localStorage.getItem(JL3Analytics.config.storageKey);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (e) {
        // Silently fail
    }
    return null;
};

// HOW SESSIONS WORK IN PRACTICE:
// ==============================
//
// Scenario: User visits your site from a LinkedIn post
//
// 10:00 AM - User clicks your LinkedIn link
//   URL: jamesjlaurieiii.com/?utm_source=linkedin&utm_campaign=duffdash
//   → No session exists, so we CREATE one:
//     {
//       sessionId: "abc-123",
//       createdAt: 10:00 AM,
//       lastActivity: 10:00 AM,
//       utmParams: { utm_source: "linkedin", utm_campaign: "duffdash" }
//     }
//
// 10:02 AM - User clicks to /case-studies page
//   → Session exists and lastActivity (10:00) was 2 min ago (< 30 min)
//   → Session is VALID! Update lastActivity to 10:02 AM
//
// 10:05 AM - User clicks "Book a Call" button
//   → Session still valid, update lastActivity to 10:05 AM
//   → All 3 events share session "abc-123" - we can see the full journey!
//
// 11:00 AM - User comes back (55 min later)
//   → Session exists but lastActivity (10:05) was 55 min ago (> 30 min)
//   → Session EXPIRED! Create a NEW session "xyz-789"
//   → This is a NEW visit (even though same person)

// ============================================================================
// PART 5: EVENT TRACKING (The Beating Heart!)
// ============================================================================
//
// WHAT IS AN EVENT?
// =================
// An event is ANYTHING that happens on your website that you want to know about.
//
// Examples of events:
//   - "page_view"     → Someone loaded a page
//   - "cta_click"     → Someone clicked "Book a Call" button
//   - "outbound_link" → Someone clicked a link to another site
//   - "scroll_depth"  → Someone scrolled 50% down the page
//   - "video_play"    → Someone started watching a video
//
// Each event is a small package of data (JSON) that answers:
//   - WHAT happened? (event_type)
//   - WHEN did it happen? (timestamp)
//   - WHERE on the site? (page path)
//   - WHO did it? (session ID)
//   - HOW did they get here? (UTM parameters)
//
// THE EVENT PAYLOAD (What We Send)
// =================================
// Every event we track looks like this:
//
// {
//   "event_id": "unique-id-for-this-specific-event",
//   "event_type": "page_view",
//   "event_ts": "2026-01-24T20:15:00.000Z",
//   "property": "jamesjlaurieiii",
//
//   "session_id": "abc-123-session-id",
//   "page_path": "/case-studies/duffdash.html",
//   "page_title": "DuffDash Case Study",
//   "referrer": "https://linkedin.com/feed",
//
//   "utm_source": "linkedin",
//   "utm_medium": "social",
//   "utm_campaign": "duffdash_launch",
//   "utm_content": null,
//   "utm_term": null,
//
//   "screen_width": 1920,
//   "screen_height": 1080,
//   "user_agent": "Mozilla/5.0..."
// }
//
// This is EVERYTHING we need to understand who visited and what they did!

// ----------------------------------------------------------------------------
// FUNCTION: Track Event (The Main Workhorse)
// ----------------------------------------------------------------------------
//
// This is THE function that tracks events. Everything else calls this.
//
// Parameters:
//   - eventType: What kind of event? ("page_view", "cta_click", etc.)
//   - eventData: Extra details specific to this event (optional)
//
// Usage:
//   JL3Analytics.trackEvent("page_view");
//   JL3Analytics.trackEvent("cta_click", { button_id: "book-call" });

JL3Analytics.trackEvent = function(eventType, eventData) {
    // Default eventData to empty object if not provided
    eventData = eventData || {};

    // STEP 1: Get (or create) the current session
    // ============================================
    // This ensures we have a session ID and UTM params
    var session = JL3Analytics.getOrCreateSession();

    // STEP 2: Build the event payload
    // ================================
    // We're assembling all the data into one nice package

    var payload = {
        // === IDENTIFIERS ===
        // Every event needs unique IDs so we can track it

        event_id: JL3Analytics.generateUUID(),
        // ^^^ Unique ID for THIS specific event
        //     Even if someone views the same page twice, each gets unique ID

        event_type: eventType,
        // ^^^ What happened: "page_view", "cta_click", etc.

        event_ts: new Date().toISOString(),
        // ^^^ Timestamp in ISO format: "2026-01-24T20:15:00.000Z"
        //     ISO format is universal - computers everywhere understand it
        //     The "Z" means UTC timezone (no confusion about timezones!)

        property: JL3Analytics.config.property,
        // ^^^ Which website: "jamesjlaurieiii"

        // === SESSION INFO ===
        // Links this event to the visitor's session

        session_id: session.sessionId,
        // ^^^ Connects this event to all other events in the same session

        // === PAGE INFO ===
        // Where on the site did this happen?

        page_path: window.location.pathname,
        // ^^^ Just the path: "/case-studies/duffdash.html"
        //     window.location.pathname strips out domain and query string

        page_url: window.location.href,
        // ^^^ Full URL: "https://jamesjlaurieiii.com/case-studies/duffdash.html"

        page_title: document.title,
        // ^^^ The <title> tag: "DuffDash Case Study | James Laurie"

        referrer: document.referrer || null,
        // ^^^ Where they came FROM: "https://linkedin.com/feed"
        //     If they typed URL directly, this is empty

        // === UTM PARAMETERS ===
        // Marketing attribution - how did they find us?
        // We grab these from the session (captured when they first arrived)

        utm_source: session.utmParams.utm_source,
        utm_medium: session.utmParams.utm_medium,
        utm_campaign: session.utmParams.utm_campaign,
        utm_content: session.utmParams.utm_content,
        utm_term: session.utmParams.utm_term,

        // === DEVICE INFO ===
        // What device are they using?

        screen_width: window.screen.width,
        screen_height: window.screen.height,
        // ^^^ Screen resolution: 1920 x 1080, 375 x 812 (iPhone), etc.
        //     Helps you know: "Are mobile users bouncing more?"

        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        // ^^^ Browser window size (might be smaller than screen if not maximized)

        user_agent: navigator.userAgent
        // ^^^ Browser/OS info: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
        //     Looks cryptic, but tells us: Windows, Chrome, version, etc.
    };

    // STEP 3: Merge in any extra event-specific data
    // ================================================
    // If caller passed extra data like { button_id: "cta-1" }, add it
    //
    // Object.keys gets all the property names: ["button_id"]
    // Then we loop and copy each one to our payload

    var extraKeys = Object.keys(eventData);
    for (var i = 0; i < extraKeys.length; i++) {
        var key = extraKeys[i];
        payload[key] = eventData[key];
    }

    // STEP 4: Send the event!
    // ========================
    JL3Analytics.sendEvent(payload);

    return payload; // Return it so caller can see what was tracked
};

// ----------------------------------------------------------------------------
// FUNCTION: Send Event (The Delivery Truck)
// ----------------------------------------------------------------------------
//
// This function SENDS the event data to its destination.
// Right now: logs to console (for testing)
// Later: sends to our API Gateway
//
// WHY SEPARATE THIS FROM trackEvent()?
// Because the "what to track" and "how to send it" are different concerns.
// If we change HOW we send (different API, different format), we only
// change this one function. Everything else stays the same!
//
// This is called "Separation of Concerns" - a key programming principle.

JL3Analytics.sendEvent = function(payload) {
    // Log to console (always, for debugging)
    JL3Analytics.log("Event tracked:", payload);

    // If we have an API endpoint configured, send it there
    if (JL3Analytics.config.endpoint && !JL3Analytics.config.endpoint.includes("REPLACE_WITH")) {
        // Send event to API Gateway using fetch with CORS
        fetch(JL3Analytics.config.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            // Use 'cors' mode for cross-origin requests
            mode: "cors",
            // Don't send cookies (we don't need them)
            credentials: "omit",
            // Use keepalive to ensure request completes even if page unloads
            keepalive: true
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            JL3Analytics.log("Event sent successfully:", data.ingest_id);
        })
        .catch(function(error) {
            // Log error but don't disrupt user experience
            JL3Analytics.log("Failed to send event:", error.message);
        });
    } else {
        JL3Analytics.log("Endpoint not configured - event logged locally only");
    }

    // Also store in a local array (useful for debugging)
    JL3Analytics.events = JL3Analytics.events || [];
    JL3Analytics.events.push(payload);
    // ^^^ Now you can type JL3Analytics.events in console to see ALL events!
};

// ----------------------------------------------------------------------------
// FUNCTION: Track Page View (Convenience Function)
// ----------------------------------------------------------------------------
//
// Tracking a page view is SO common that we made a shortcut.
// Instead of: JL3Analytics.trackEvent("page_view", {})
// You can use: JL3Analytics.trackPageView()
//
// This also adds some page-specific data automatically.

JL3Analytics.trackPageView = function() {
    JL3Analytics.trackEvent("page_view", {
        // Add any page-view-specific data here
        // For now, the base payload has everything we need
    });
};

// ----------------------------------------------------------------------------
// FUNCTION: Track CTA Click (Convenience Function)
// ----------------------------------------------------------------------------
//
// Track when someone clicks a Call-to-Action button
//
// Usage:
//   JL3Analytics.trackCTAClick("book-call-header");
//   JL3Analytics.trackCTAClick("contact-form-submit");

JL3Analytics.trackCTAClick = function(buttonId, buttonText) {
    JL3Analytics.trackEvent("cta_click", {
        button_id: buttonId || "unknown",
        button_text: buttonText || null
    });
};

// ----------------------------------------------------------------------------
// FUNCTION: Track Outbound Link (Convenience Function)
// ----------------------------------------------------------------------------
//
// Track when someone clicks a link that leaves your site
// (like clicking through to your LinkedIn, or a client's site)
//
// Usage:
//   JL3Analytics.trackOutboundLink("https://linkedin.com/in/jameslaurie");

JL3Analytics.trackOutboundLink = function(targetUrl) {
    JL3Analytics.trackEvent("outbound_link", {
        target_url: targetUrl
    });
};

// TEST IT!
// ========
// Open browser console and type:
//
//   JL3Analytics.trackPageView()
//   → See the full event object logged!
//
//   JL3Analytics.trackCTAClick("my-button", "Click Me")
//   → See a cta_click event!
//
//   JL3Analytics.events
//   → See ALL events tracked so far!

// ============================================================================
// PART 6: AUTO-INITIALIZATION (Bringing It to Life!)
// ============================================================================
//
// Right now our code just SITS there. It's like a car with no one driving it.
// We need to:
//   1. START the engine when the page loads
//   2. LISTEN for user actions (clicks)
//   3. RESPOND to those actions by tracking events
//
// WHAT IS INITIALIZATION?
// =======================
// "Initialization" (or "init") means "set everything up and start running."
// It's like the morning routine for our code:
//   - Wake up (page loads)
//   - Get ready (set up event listeners)
//   - Start working (track the first page view)
//
// WHEN DOES THE PAGE "LOAD"?
// ==========================
// There are actually TWO stages:
//
//   1. DOMContentLoaded - HTML is ready, but images/CSS might still load
//   2. window.onload    - EVERYTHING is ready (images, CSS, fonts, etc.)
//
// We use DOMContentLoaded because:
//   - It's faster (doesn't wait for images)
//   - We only need the HTML to be ready (to find buttons, links, etc.)
//   - We want to track the page view ASAP
//
// WHAT IS AN EVENT LISTENER?
// ==========================
// An event listener is like a security guard who watches for specific things.
//
//   "Hey guard, if anyone CLICKS on this button, tell me!"
//   button.addEventListener("click", function() { ... })
//
//   "Hey guard, if the page finishes loading, tell me!"
//   document.addEventListener("DOMContentLoaded", function() { ... })
//
// The browser has dozens of events: click, scroll, mouseover, keypress, etc.
// We "listen" for the ones we care about.

// ----------------------------------------------------------------------------
// FUNCTION: Initialize Analytics
// ----------------------------------------------------------------------------
//
// This is the "wake up and start working" function.
// It runs once when the page loads.

JL3Analytics.init = function() {
    JL3Analytics.log("Initializing analytics...");

    // STEP 1: Track the page view
    // ===========================
    // The first thing we do is record that someone viewed this page
    JL3Analytics.trackPageView();

    // STEP 2: Set up click tracking
    // =============================
    // We'll listen for ALL clicks on the page, then decide what to track
    JL3Analytics.setupClickTracking();

    // STEP 3: Set up scroll depth tracking
    // ====================================
    // Track 25%, 50%, 75%, 100% scroll milestones
    JL3Analytics.setupScrollTracking();

    // STEP 4: Set up time on page tracking
    // ====================================
    // Track 30s, 60s, 180s, 300s time intervals
    JL3Analytics.setupTimeTracking();

    // STEP 5: Set up form tracking
    // ============================
    // Track form starts and submissions
    JL3Analytics.setupFormTracking();

    // STEP 6: Set up exit intent tracking
    // ===================================
    // Track when user is about to leave
    JL3Analytics.setupExitIntent();

    JL3Analytics.log("Analytics initialized!");
};

// ----------------------------------------------------------------------------
// FUNCTION: Setup Click Tracking (Event Delegation)
// ----------------------------------------------------------------------------
//
// WHAT IS EVENT DELEGATION?
// =========================
// Instead of adding a listener to EVERY button and link individually:
//   button1.addEventListener("click", ...)  // tedious!
//   button2.addEventListener("click", ...)  // so many!
//   button3.addEventListener("click", ...)  // ugh!
//
// We add ONE listener to the whole document:
//   document.addEventListener("click", ...)  // catches ALL clicks!
//
// Then we check WHAT was clicked and decide if we care.
//
// WHY IS THIS BETTER?
//   1. Less code (one listener vs hundreds)
//   2. Works for elements added later (dynamic content)
//   3. Better performance (fewer listeners = less memory)
//
// ANALOGY:
// Instead of putting a security camera on every item in a store,
// put ONE camera at the exit and check what people are carrying.

JL3Analytics.setupClickTracking = function() {

    // Listen for ALL clicks on the entire document
    document.addEventListener("click", function(event) {
        // "event" contains info about what was clicked
        // event.target = the actual element that was clicked

        var clickedElement = event.target;

        // Sometimes you click on an <span> inside a <button>
        // We need to find the actual button/link (walk up the tree)
        var link = JL3Analytics.findParentLink(clickedElement);
        var ctaButton = JL3Analytics.findParentCTA(clickedElement);

        // CHECK 1: Was it a CTA button?
        // ==============================
        // CTA = Call To Action (buttons you REALLY want people to click)
        // We mark these with: data-analytics="cta"
        //
        // Example in HTML:
        //   <button data-analytics="cta" data-analytics-id="book-call">
        //     Book a Call
        //   </button>

        if (ctaButton) {
            var buttonId = ctaButton.getAttribute("data-analytics-id") ||
                           ctaButton.id ||
                           "unnamed-cta";
            var buttonText = ctaButton.innerText || ctaButton.textContent;

            JL3Analytics.trackCTAClick(buttonId, buttonText.trim());
            JL3Analytics.log("CTA clicked:", buttonId);
        }

        // CHECK 2: Was it an outbound link?
        // ==================================
        // Outbound = link to a DIFFERENT website
        // We detect this by comparing the link's hostname to our hostname

        if (link && link.href) {
            var linkUrl = link.href;
            var isOutbound = JL3Analytics.isOutboundLink(linkUrl);

            if (isOutbound) {
                JL3Analytics.trackOutboundLink(linkUrl);
                JL3Analytics.log("Outbound link clicked:", linkUrl);
            }
        }
    });

    JL3Analytics.log("Click tracking enabled");
};

// ----------------------------------------------------------------------------
// HELPER: Find Parent Link
// ----------------------------------------------------------------------------
//
// When you click on <a><span>Click me</span></a>, the event.target is <span>
// But we need to find the <a> to get the href.
// This function "walks up" the DOM tree to find the nearest <a> tag.
//
// WHAT IS THE DOM TREE?
// =====================
// The DOM (Document Object Model) is how browsers represent HTML.
// It's a tree structure:
//
//   <body>
//     └── <nav>
//           └── <a href="...">
//                 └── <span>Click me</span>   ← You clicked HERE
//
// We need to walk UP from <span> to find <a>

JL3Analytics.findParentLink = function(element) {
    // Walk up the tree until we find an <a> or reach the top
    while (element && element !== document) {
        // Check if this element is an <a> tag
        if (element.tagName && element.tagName.toLowerCase() === "a") {
            return element;  // Found it!
        }
        // Move up to the parent
        element = element.parentElement;
    }
    return null;  // No <a> found
};

// ----------------------------------------------------------------------------
// HELPER: Find Parent CTA
// ----------------------------------------------------------------------------
//
// Same idea as findParentLink, but looking for data-analytics="cta"

JL3Analytics.findParentCTA = function(element) {
    while (element && element !== document) {
        // Check if this element has data-analytics="cta"
        if (element.getAttribute && element.getAttribute("data-analytics") === "cta") {
            return element;
        }
        element = element.parentElement;
    }
    return null;
};

// ----------------------------------------------------------------------------
// HELPER: Is Outbound Link?
// ----------------------------------------------------------------------------
//
// Checks if a URL goes to a DIFFERENT website than ours.
//
// Our site: jamesjlaurieiii.com
//   - "/contact" → internal (same site)
//   - "https://jamesjlaurieiii.com/about" → internal (same site)
//   - "https://linkedin.com/in/james" → OUTBOUND (different site!)
//   - "mailto:james@example.com" → not outbound (it's email)

JL3Analytics.isOutboundLink = function(url) {
    // Skip non-http links (mailto:, tel:, javascript:, etc.)
    if (!url || !url.startsWith("http")) {
        return false;
    }

    try {
        // Create a URL object to easily parse the link
        // new URL("https://linkedin.com/in/james")
        //   → hostname = "linkedin.com"
        var linkUrl = new URL(url);
        var currentHost = window.location.hostname;
        // ^^^ Our site: "jamesjlaurieiii.com"

        // If hostnames are different, it's outbound!
        return linkUrl.hostname !== currentHost;
    } catch (e) {
        // If URL parsing fails, assume it's not outbound
        return false;
    }
};

// ============================================================================
// PART 6B: ADVANCED TRACKING (Scroll, Time, Engagement)
// ============================================================================
//
// These are additional behaviors people commonly track:
// - Scroll depth (did they read the whole page?)
// - Time on page (did they engage or bounce?)
// - Form interactions (did they start filling out a form?)
// - Video plays (if you have videos)

// ----------------------------------------------------------------------------
// SCROLL DEPTH TRACKING
// ----------------------------------------------------------------------------
// Track how far down the page someone scrolled.
// This tells you if people are actually READING your content.
//
// We track milestones: 25%, 50%, 75%, 100%
// Only fire each milestone ONCE per page.

JL3Analytics.setupScrollTracking = function() {
    var scrollMilestones = [25, 50, 75, 100];
    var milestonesReached = {};  // Track which we've already fired

    // Throttle function - don't fire on every pixel scrolled
    var throttle = function(func, limit) {
        var inThrottle;
        return function() {
            if (!inThrottle) {
                func.apply(this, arguments);
                inThrottle = true;
                setTimeout(function() { inThrottle = false; }, limit);
            }
        };
    };

    var checkScroll = function() {
        // Calculate scroll percentage
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;

        if (docHeight <= 0) return;  // Page too short to scroll

        var scrollPercent = Math.round((scrollTop / docHeight) * 100);

        // Check each milestone
        for (var i = 0; i < scrollMilestones.length; i++) {
            var milestone = scrollMilestones[i];

            if (scrollPercent >= milestone && !milestonesReached[milestone]) {
                milestonesReached[milestone] = true;

                JL3Analytics.trackEvent("scroll_depth", {
                    depth_percent: milestone,
                    page_path: window.location.pathname
                });

                JL3Analytics.log("Scroll milestone reached:", milestone + "%");
            }
        }
    };

    // Listen for scroll events (throttled to every 250ms)
    window.addEventListener("scroll", throttle(checkScroll, 250));
};

// ----------------------------------------------------------------------------
// TIME ON PAGE TRACKING
// ----------------------------------------------------------------------------
// Track how long someone spends on the page.
// Fire events at intervals: 30s, 60s, 180s, 300s
//
// This helps identify:
// - Bounce rate (left before 30s = probably bounced)
// - Engaged readers (stayed 3+ minutes)

JL3Analytics.setupTimeTracking = function() {
    var timeIntervals = [30, 60, 180, 300];  // seconds
    var intervalsFired = {};
    var startTime = Date.now();

    var checkTime = function() {
        var elapsed = Math.floor((Date.now() - startTime) / 1000);

        for (var i = 0; i < timeIntervals.length; i++) {
            var interval = timeIntervals[i];

            if (elapsed >= interval && !intervalsFired[interval]) {
                intervalsFired[interval] = true;

                JL3Analytics.trackEvent("time_on_page", {
                    seconds: interval,
                    page_path: window.location.pathname
                });

                JL3Analytics.log("Time on page:", interval + " seconds");
            }
        }
    };

    // Check every 10 seconds
    setInterval(checkTime, 10000);
};

// ----------------------------------------------------------------------------
// FORM INTERACTION TRACKING
// ----------------------------------------------------------------------------
// Track when someone starts filling out a form.
// This tells you about "form abandonment" - people who started but didn't finish.

JL3Analytics.setupFormTracking = function() {
    var formsTracked = {};

    document.addEventListener("focus", function(event) {
        var element = event.target;

        // Check if it's a form input
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
            var form = element.closest("form");

            if (form) {
                var formId = form.id || form.getAttribute("name") || "unnamed-form";

                // Only fire once per form per session
                if (!formsTracked[formId]) {
                    formsTracked[formId] = true;

                    JL3Analytics.trackEvent("form_start", {
                        form_id: formId,
                        first_field: element.name || element.id || "unknown"
                    });

                    JL3Analytics.log("Form interaction started:", formId);
                }
            }
        }
    }, true);  // Use capture phase

    // Track form submissions
    document.addEventListener("submit", function(event) {
        var form = event.target;
        var formId = form.id || form.getAttribute("name") || "unnamed-form";

        JL3Analytics.trackEvent("form_submit", {
            form_id: formId
        });

        JL3Analytics.log("Form submitted:", formId);
    });
};

// ----------------------------------------------------------------------------
// EXIT INTENT TRACKING
// ----------------------------------------------------------------------------
// Track when someone is about to leave (mouse moves to close tab).
// Useful for triggering popups or understanding exit behavior.

JL3Analytics.setupExitIntent = function() {
    var exitIntentFired = false;

    document.addEventListener("mouseout", function(event) {
        // Only fire once per session
        if (exitIntentFired) return;

        // Check if mouse left through the top of the page (toward browser chrome)
        if (event.clientY < 10 && event.relatedTarget === null) {
            exitIntentFired = true;

            JL3Analytics.trackEvent("exit_intent", {
                page_path: window.location.pathname,
                time_on_page: Math.floor((Date.now() - window.performance.timing.navigationStart) / 1000)
            });

            JL3Analytics.log("Exit intent detected");
        }
    });
};

// ============================================================================
// PART 7: START IT UP! (The Ignition)
// ============================================================================
//
// Everything above DEFINES what our code can do.
// Now we actually TELL IT TO RUN.
//
// We wait for DOMContentLoaded (page HTML is ready) then call init()

// Check if the DOM is already loaded (in case our script loads late)
if (document.readyState === "loading") {
    // DOM is still loading, wait for it
    document.addEventListener("DOMContentLoaded", JL3Analytics.init);
} else {
    // DOM is already ready, run init now!
    JL3Analytics.init();
}

// ============================================================================
// HOW TO USE THIS ON YOUR SITE
// ============================================================================
//
// 1. ADD THE SCRIPT TO YOUR HTML:
//    Just before </body>, add:
//    <script src="/assets/js/analytics.js"></script>
//
// 2. MARK YOUR CTAs:
//    Add data attributes to important buttons:
//    <a href="/contact" data-analytics="cta" data-analytics-id="contact-header">
//      Contact Me
//    </a>
//
// 3. THAT'S IT!
//    - Page views are tracked automatically
//    - CTA clicks are tracked automatically (if marked)
//    - Outbound links are tracked automatically
//
// 4. TO TEST:
//    Open browser console (F12) and look for "[JL3 Analytics]" messages
//    Type JL3Analytics.events to see all tracked events
//
// ============================================================================
// DEPLOYMENT NOTES
// ============================================================================
//
// The analytics pipeline is now complete! Events flow:
//   Browser → API Gateway → Lambda → Kinesis → Firehose → S3
//
// After deploying infrastructure:
//   1. Run: cd infra/envs/prod && terraform output analytics_api_endpoint
//   2. Update config.endpoint above with the output URL
//   3. Deploy static site: ./infra/deploy_s3_cloudfront.sh
//
// Cost control:
//   - Full pipeline (~$12-15/mo): terraform apply -var="kinesis_stream_enabled=true"
//   - Minimal (~$1/mo): terraform apply -var="kinesis_stream_enabled=false"

