/**
 * Campaign: Watch Me Watch You
 *
 * This script handles the real-time visitor display on the campaign landing page.
 * It shows visitors their own session data and tracks their funnel progress.
 */

(function() {
    'use strict';

    // ========================================================================
    // STATE
    // ========================================================================

    var CampaignTracker = {
        startTime: Date.now(),
        maxScroll: 0,
        eventCount: 0,
        funnelState: {
            pageview: true, // Already happened when page loaded
            scroll25: false,
            scroll50: false,
            cta: false,
            form: false
        }
    };

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    function init() {
        // Wait for JL3Analytics to be ready
        if (typeof JL3Analytics === 'undefined') {
            setTimeout(init, 100);
            return;
        }

        // Initialize displays
        updateSessionDisplay();
        updateSourceDisplay();
        setupScrollTracking();
        setupTimeTracking();
        setupFormTracking();
        setupDashboardEmbed();
        setupCtaTracking();

        // Update funnel step 1 (pageview)
        markFunnelStep('step-pageview');

        console.log('[Campaign] Watch Me Watch You initialized');
    }

    // ========================================================================
    // SESSION DISPLAY
    // ========================================================================

    function updateSessionDisplay() {
        // Get session info from JL3Analytics
        var session = JL3Analytics.getCurrentSession();

        if (session) {
            // Session ID (truncated for display)
            var sessionIdEl = document.getElementById('sessionId');
            if (sessionIdEl) {
                var shortId = session.sessionId.substring(0, 8) + '...';
                sessionIdEl.textContent = shortId;
            }

            // Populate hidden form fields
            var formSessionId = document.getElementById('form_session_id');
            if (formSessionId) {
                formSessionId.value = session.sessionId;
            }

            // UTM params
            if (session.utmParams) {
                var formSource = document.getElementById('form_utm_source');
                var formMedium = document.getElementById('form_utm_medium');
                var formCampaign = document.getElementById('form_utm_campaign');

                if (formSource) formSource.value = session.utmParams.utm_source || '';
                if (formMedium) formMedium.value = session.utmParams.utm_medium || '';
                if (formCampaign) formCampaign.value = session.utmParams.utm_campaign || '';
            }
        }
    }

    function updateSourceDisplay() {
        // Get UTM source from URL or session
        var source = getUTMSource();
        var displaySource = source ? capitalizeFirst(source) : 'Direct';

        // Update hero badge
        var heroSource = document.getElementById('heroSource');
        if (heroSource) {
            if (source) {
                heroSource.textContent = 'Welcome from ' + displaySource + '!';
            } else {
                heroSource.textContent = 'Tracking your visit...';
            }
        }

        // Update session source
        var sessionSource = document.getElementById('sessionSource');
        if (sessionSource) {
            sessionSource.textContent = displaySource;
        }
    }

    function getUTMSource() {
        // Try from URL first
        var urlParams = new URLSearchParams(window.location.search);
        var source = urlParams.get('utm_source');

        if (source) return source;

        // Try from session
        var session = JL3Analytics.getCurrentSession();
        if (session && session.utmParams && session.utmParams.utm_source) {
            return session.utmParams.utm_source;
        }

        return null;
    }

    // ========================================================================
    // SCROLL TRACKING
    // ========================================================================

    function setupScrollTracking() {
        var scrollProgressBar = document.getElementById('scrollProgress');
        var scrollDepthEl = document.getElementById('scrollDepth');

        function updateScroll() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;

            if (docHeight <= 0) return;

            var scrollPercent = Math.round((scrollTop / docHeight) * 100);

            // Update progress bar
            if (scrollProgressBar) {
                scrollProgressBar.style.width = scrollPercent + '%';
            }

            // Update session card
            if (scrollDepthEl) {
                scrollDepthEl.textContent = scrollPercent + '%';
            }

            // Track max scroll
            if (scrollPercent > CampaignTracker.maxScroll) {
                CampaignTracker.maxScroll = scrollPercent;

                // Update funnel steps
                if (scrollPercent >= 25 && !CampaignTracker.funnelState.scroll25) {
                    CampaignTracker.funnelState.scroll25 = true;
                    markFunnelStep('step-scroll25');
                }

                if (scrollPercent >= 50 && !CampaignTracker.funnelState.scroll50) {
                    CampaignTracker.funnelState.scroll50 = true;
                    markFunnelStep('step-scroll50');
                }
            }
        }

        // Throttled scroll listener
        var scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(function() {
                scrollTimeout = null;
                updateScroll();
            }, 50);
        });

        // Initial update
        updateScroll();
    }

    // ========================================================================
    // TIME TRACKING
    // ========================================================================

    function setupTimeTracking() {
        var timeEl = document.getElementById('timeOnPage');
        var totalEventsEl = document.getElementById('totalEvents');

        function updateTime() {
            var elapsed = Math.floor((Date.now() - CampaignTracker.startTime) / 1000);
            var minutes = Math.floor(elapsed / 60);
            var seconds = elapsed % 60;

            if (timeEl) {
                timeEl.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
            }
        }

        function updateEventCount() {
            if (JL3Analytics.events && totalEventsEl) {
                totalEventsEl.textContent = JL3Analytics.events.length;
                CampaignTracker.eventCount = JL3Analytics.events.length;
            }
        }

        // Update every second
        setInterval(function() {
            updateTime();
            updateEventCount();
        }, 1000);
    }

    // ========================================================================
    // FUNNEL TRACKING
    // ========================================================================

    function markFunnelStep(stepId) {
        var step = document.getElementById(stepId);
        if (step && !step.classList.contains('completed')) {
            step.classList.add('completed');

            // Update icon to checkmark
            var icon = step.querySelector('.step-icon');
            if (icon) {
                icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            }
        }
    }

    // ========================================================================
    // CTA TRACKING
    // ========================================================================

    function setupCtaTracking() {
        // Listen for clicks on any CTA
        document.addEventListener('click', function(e) {
            var target = e.target;

            // Check if clicked element or parent has data-analytics="cta"
            while (target && target !== document) {
                if (target.getAttribute && target.getAttribute('data-analytics') === 'cta') {
                    if (!CampaignTracker.funnelState.cta) {
                        CampaignTracker.funnelState.cta = true;
                        markFunnelStep('step-cta');
                    }
                    return;
                }
                target = target.parentElement;
            }
        });
    }

    // ========================================================================
    // FORM TRACKING
    // ========================================================================

    function setupFormTracking() {
        var form = document.getElementById('leadForm');
        var formSuccess = document.getElementById('formSuccess');

        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Mark funnel step
            if (!CampaignTracker.funnelState.form) {
                CampaignTracker.funnelState.form = true;
                markFunnelStep('step-form');
            }

            // Track the form submit event
            if (typeof JL3Analytics !== 'undefined') {
                JL3Analytics.trackEvent('form_submit', {
                    form_id: 'lead-form',
                    form_name: 'watch_me_watch_you_lead'
                });
            }

            // Submit form data
            var formData = new FormData(form);

            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(function(response) {
                if (response.ok) {
                    // Show success message
                    form.style.display = 'none';
                    if (formSuccess) {
                        formSuccess.classList.remove('hidden');
                    }
                } else {
                    throw new Error('Form submission failed');
                }
            })
            .catch(function(error) {
                console.error('[Campaign] Form error:', error);
                // Still show success for demo purposes
                form.style.display = 'none';
                if (formSuccess) {
                    formSuccess.classList.remove('hidden');
                }
            });
        });
    }

    // ========================================================================
    // DASHBOARD EMBED
    // ========================================================================

    function setupDashboardEmbed() {
        var iframe = document.getElementById('dashboardFrame');
        var overlay = document.getElementById('dashboardOverlay');

        if (!iframe || !overlay) return;

        // Hide overlay when iframe loads
        iframe.addEventListener('load', function() {
            setTimeout(function() {
                overlay.classList.add('hidden');
            }, 1000);
        });

        // Fallback: hide overlay after 10 seconds regardless
        setTimeout(function() {
            overlay.classList.add('hidden');
        }, 10000);
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    function capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ========================================================================
    // STARTUP
    // ========================================================================

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
