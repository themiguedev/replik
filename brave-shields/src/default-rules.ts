/**
 * Baseline EasyList & EasyPrivacy rules ensuring foundational ad and tracker
 * blocking out of the box across all browser sessions.
 */
export const BASE_EASYLIST_RULES = `
! Surrogate redirects for analytics (prevents site crashes)
||google-analytics.com/analytics.js$script,redirect=noop.js
||google-analytics.com/ga.js$script,redirect=noop.js
||googletagmanager.com/gtag/js$script,redirect=noop.js

! Baseline Google Ad & Tracking Suite
||doubleclick.net^
||google-analytics.com^
||googlesyndication.com^
||googleadservices.com^
||adservice.google.com^
||pagead2.googlesyndication.com^

! Major Programmatic Ad Networks, Exchanges & DSPs
||adnxs.com^
||amazon-adsystem.com^
||criteo.com^
||criteo.net^
||rubiconproject.com^
||pubmatic.com^
||openx.net^
||casalemedia.com^
||bidswitch.net^
||smartadserver.com^
||adroll.com^
||yieldmo.com^
||contextweb.com^
||lijit.com^
||sharethrough.com^
||exponential.com^
||serving-sys.com^
||moatads.com^

! Content Recommendation & Native Ads
||taboola.com^
||outbrain.com^
||revcontent.com^
||mgid.com^
||zergnet.com^
||infolinks.com^

! Popunders & High-Aggression Ad Networks
||popads.net^
||popcash.net^
||propellerads.com^
||exoclick.com^
||adsterra.com^

! Telemetry, Session Trackers & Social Tracking
||scorecardresearch.com^
||quantserve.com^
||facebook.net/en_US/fbevents.js^
||connect.facebook.net/*/sdk.js*
||hotjar.com^
||clarity.ms^
||chartbeat.com^
||segment.io^
||segment.com^
||mixpanel.com^
||amplitude.com^

! Baseline Cosmetic Element Hiding
##.ad-banner
##.sponsored-post
##.adsbygoogle
##.ad-container
##.advertisement
##.ad-wrapper
##.ad-box
##.ad-unit
##[id^="google_ads_"]
##[id^="div-gpt-ad"]
`;
