# MyScript WebSocket vs REST API - Research Findings

**Date:** November 6, 2025
**Decision:** Use REST API with `/recognize` endpoint
**Status:** Implemented and verified working

---

## Executive Summary

After comprehensive research and testing, **we are using the REST API with the `/recognize` endpoint** for handwriting recognition in this React Native app.

### Key Findings:
- ✅ `/recognize` endpoint (latest engines) delivers significantly better recognition quality than `/batch` (legacy engines)
- ✅ REST API is the optimal choice for our pause-detection workflow (250-500ms pause between steps)
- ✅ WebSocket would require 650-900 LOC rewrite with minimal benefit for our use case
- ⚠️ MyScript's iinkJS WebSocket library is **archived and no longer maintained** (as of Jan 15, 2024)
- ⚠️ WebSocket requires complex state management, reconnection logic, and doesn't fit our batch-stroke approach

---

## 1. MyScript API Endpoints

### REST API Endpoints

| Endpoint | Engine | Status | Use Case |
|----------|--------|--------|----------|
| `/api/v4.0/iink/batch` | Legacy | ⚠️ Older | Historical compatibility |
| `/api/v4.0/iink/recognize` | Latest | ✅ **Recommended** | New projects, best accuracy |

**Our Choice:** `/recognize` endpoint with REST API

### WebSocket Endpoint
- `wss://cloud.myscript.com/api/v4.0/iink/websocket`
- Protocol: Full-duplex bidirectional communication over persistent TCP connection
- Library: iinkJS (archived Jan 2024)

---

## 2. REST vs WebSocket Comparison

| Aspect | REST API (`/recognize`) | WebSocket |
|--------|------------------------|-----------|
| **Connection** | New HTTPS request per recognition | Single persistent WebSocket connection |
| **Latency** | Higher per-request overhead | Lower per-message overhead |
| **Recognition Model** | Batch: send all strokes → get result | Streaming: send strokes incrementally → progressive results |
| **Best For** | Pause-detection workflow (our app) | Real-time drawing feedback |
| **Implementation** | Simple, stateless | Complex, stateful |
| **Mobile Stability** | Excellent (no dropped connections) | Good (requires reconnection on network changes) |
| **Session Limits** | None (request timeout only) | 5 min max, 3 min inactivity timeout |
| **Maintenance** | Low (stable, well-documented) | High (archived SDK, custom protocol) |
| **React Native Support** | Excellent (axios/fetch) | Good (native WebSocket API, no high-level SDK) |

---

## 3. Recognition Workflow Comparison

### Our Current REST Workflow (Optimal)
```
User draws stroke 1 → stroke 2 → stroke 3 → [250-500ms pause detected]
                                              ↓
                                         Batch all strokes
                                              ↓
                                   POST to /recognize endpoint
                                              ↓
                                   Parse LaTeX/MathML result
                                              ↓
                                      Display to user
```

**Advantages:**
- Natural grouping at pause points
- Clean separation between drawing and recognition phases
- Strokes batched logically (by user intent)
- No state management complexity

### WebSocket Workflow (Overkill for our case)
```
User draws stroke 1 → Send to WebSocket → Server ACK
                                        ↓
                               Intermediate result (optional)
                                        ↓
User draws stroke 2 → Send to WebSocket → Server ACK
                                        ↓
                               Intermediate result (optional)
                                        ↓
User draws stroke 3 → Send to WebSocket → Server ACK
                                        ↓
                               Progressive recognition
                                        ↓
[Pause detected or user signals completion]
                                        ↓
                               Final recognition result
```

**Disadvantages for our app:**
- We don't need intermediate results during drawing
- Adds complexity with minimal UX benefit
- Requires managing WebSocket connection state
- Pause detection still required to know when to finalize

---

## 4. WebSocket Implementation Details

### What WebSocket Offers

1. **Real-time Stroke Acknowledgment**
   - Server confirms receipt of each stroke
   - Returns SVG patches for immediate visual feedback
   - Good for showing "ink as you draw" effects

2. **Progressive Gesture Detection**
   - Gestures (undo, clear, etc.) detected immediately
   - Useful for implementing gesture-based editing

3. **Incremental Recognition**
   - Get recognition results as strokes accumulate
   - Can show "best guess so far" before user finishes
   - Updates in real-time as more strokes added

4. **Lower Per-Message Overhead**
   - No HTTP headers per stroke
   - Connection reuse reduces latency
   - Good for high-frequency stroke transmission

### React Native WebSocket Support

**Good News:** React Native has native WebSocket support built-in:

```javascript
// Native WebSocket API (no library needed)
const ws = new WebSocket('wss://cloud.myscript.com/api/v4.0/iink/websocket');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify(strokeData));
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  // Handle progressive recognition results
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Connection closed');
  // Implement reconnection logic
};
```

**Optional Helper Libraries:**
- `react-native-use-websocket` - Hook-based abstraction
- `react-native-websocket` - Component wrapper
- Native API is sufficient for most use cases

### Implementation Complexity

**Estimated Work to Switch from REST to WebSocket: 40-50 hours**

| Component | Effort | Lines of Code |
|-----------|--------|---------------|
| WebSocket Connection Manager | 8-10h | 100-150 LOC |
| Stroke Streaming Logic | 10-12h | 200-300 LOC |
| Progressive Result Handling | 6-8h | 150 LOC |
| State Management Updates | 8-10h | 100 LOC |
| Error Recovery & Reconnection | 4-6h | 100 LOC |
| HMAC Authentication for WebSocket | 4-6h | 50 LOC |
| **Total** | **40-52h** | **650-900 LOC** |

**Key Challenges:**
1. **HMAC Authentication:** Different from REST, requires WebSocket-specific signing
2. **Reconnection Logic:** Handle network changes (WiFi ↔ cellular) gracefully
3. **Session Timeouts:** 5-minute max, 3-minute inactivity requires keep-alive or reconnect
4. **Stroke Ordering:** Must maintain strict order, no retransmission flexibility
5. **State Synchronization:** Ensure client and server stay in sync after reconnection

---

## 5. Performance Characteristics

### Latency Comparison

**REST API:**
- Full round-trip = network latency + API processing + response transmission
- Per-request overhead: ~50-100ms (connection setup, headers)
- Total latency: 200-500ms typical (depending on network)

**WebSocket:**
- Initial connection: ~100-200ms (one-time handshake)
- Per-message overhead: ~10-20ms (minimal framing)
- Progressive results: Intermediate feedback every 50-200ms
- Total latency for final result: Similar to REST

**Verdict for Our App:**
- REST wins for single-shot recognition after pause (our use case)
- WebSocket wins for continuous drawing with real-time feedback (not our use case)

### Throughput

**REST:**
- Each recognition = full HTTP request/response cycle
- Higher overhead per recognition call
- Good for occasional, independent requests

**WebSocket:**
- Single connection handles all messages
- Lower per-stroke overhead
- Good for sustained, frequent interactions

**Our Usage Pattern:**
- 1-3 recognition calls per problem step (low frequency)
- REST overhead is negligible for our use case

---

## 6. Mobile Network Considerations

### REST Advantages
- **Resilient to network changes:** Each request is independent
- **No connection state:** WiFi → cellular switch doesn't break anything
- **Automatic retries:** Easy to implement retry logic per request
- **Offline queue:** Failed requests can be queued and retried

### WebSocket Challenges on Mobile
- **Connection drops on network change:** WiFi ↔ cellular transition kills WebSocket
- **Reconnection required:** Must implement automatic reconnection logic
- **State recovery:** Need to resync strokes after reconnection
- **Session timeout:** 3-minute inactivity means frequent reconnects during problem-solving

**Impact on UX:**
- REST: Seamless experience, invisible to user
- WebSocket: Potential interruptions, requires "reconnecting..." UI states

---

## 7. Library & SDK Status

### REST API
- **Status:** ✅ Actively maintained and documented
- **Support:** Full MyScript Cloud API support
- **Documentation:** Comprehensive, up-to-date
- **React Native:** Excellent support via axios/fetch

### WebSocket (iinkJS)
- **Status:** ⚠️ **ARCHIVED** (as of January 15, 2024)
- **Repository:** [MyScript/iinkJS](https://github.com/MyScript/iinkJS) (read-only)
- **Last Update:** January 2024
- **Support:** No ongoing maintenance or bug fixes
- **React Native:** No official SDK, would need custom implementation

**Archive Notice from MyScript:**
> "This repository is archived and will no longer receive updates. For new projects, please use the REST API endpoints."

---

## 8. Decision Rationale

### Why We Chose REST `/recognize`

1. **Perfect Fit for Pause-Detection Workflow**
   - Our 250-500ms pause detection naturally batches strokes
   - No need for real-time streaming during drawing
   - Clean separation: draw → pause → recognize → display

2. **Simpler Implementation & Maintenance**
   - Stateless requests = no connection management
   - Easier to test, debug, and maintain
   - No edge cases around reconnection or session timeouts

3. **Better Mobile Stability**
   - REST doesn't drop on network changes
   - No WebSocket reconnection complexity
   - Reliable across WiFi/cellular transitions

4. **Latest Recognition Engines**
   - `/recognize` endpoint uses newest MyScript engines
   - Significantly better accuracy than `/batch` (legacy)
   - Actively maintained and improved by MyScript

5. **Proven Technology Stack**
   - React Native has excellent HTTP/REST support
   - axios is battle-tested and reliable
   - Our current implementation works well

6. **No Compelling WebSocket Advantages for Our Use Case**
   - We don't need real-time stroke feedback during drawing
   - We don't implement gesture recognition (yet)
   - Progressive recognition during drawing not part of UX design
   - Session-based workflow doesn't benefit from persistent connection

### Why We Rejected WebSocket

1. **Archived & Unmaintained Library**
   - iinkJS is no longer supported (archived Jan 2024)
   - Would require custom WebSocket protocol implementation
   - Higher maintenance burden going forward

2. **Overengineered for Our Needs**
   - WebSocket's real-time capabilities exceed our requirements
   - Pause-detection approach doesn't need streaming
   - Added complexity without proportional benefit

3. **Implementation Effort Not Justified**
   - 40-50 hours of development time
   - 650-900 lines of new code
   - Higher ongoing maintenance cost
   - Minimal UX improvement for our workflow

4. **Mobile Network Challenges**
   - WebSocket drops on network transitions
   - Complex reconnection logic required
   - Session timeouts complicate long problem-solving sessions

---

## 9. When to Revisit WebSocket

WebSocket implementation would be justified if we add these features:

### High-Value Features for WebSocket

1. **Real-time Gesture Recognition**
   - Implement undo/clear/erase gestures while drawing
   - Need immediate gesture detection before pause
   - WebSocket detects gestures as soon as server receives strokes

2. **Progressive Recognition Display**
   - Show "best guess so far" as user draws
   - Update LaTeX preview in real-time during drawing
   - Good for long expressions where user wants immediate feedback

3. **Collaborative Drawing**
   - Multiple users drawing on same canvas
   - Real-time synchronization across devices
   - WebSocket essential for multi-user scenarios

4. **Live Tutoring Mode**
   - Teacher watches student draw in real-time
   - Immediate intervention before student finishes
   - Requires streaming stroke data as it happens

5. **Continuous Recognition Mode**
   - No pause detection - recognize continuously
   - Useful for "dictation" mode where user never stops
   - WebSocket reduces latency for sustained drawing

### Decision Criteria for Revisiting

**Consider WebSocket migration if:**
- We profile REST latency > 2 seconds consistently on target devices
- We implement any of the high-value features listed above
- MyScript releases new supported WebSocket SDK for mobile
- User testing shows demand for real-time recognition feedback

**Re-evaluate every 6 months** (next review: May 2026)

---

## 10. Implementation Notes

### Current REST Implementation

**Endpoint:** `https://cloud.myscript.com/api/v4.0/iink/recognize`

**Request Format:**
```javascript
{
  contentType: 'Math',
  configuration: {
    lang: 'en_US',
    math: {
      mimeTypes: [
        'application/x-latex',
        'application/mathml+xml',
        'application/vnd.myscript.jiix'
      ],
      solver: { enable: true, ... }
    },
    export: { jiix: {...}, mathml: {...} }
  },
  strokes: [...],  // Flat array (key difference from /batch)
  scaleX: 1.0,
  scaleY: 1.0
}
```

**Response Format:**
```javascript
// Plain text LaTeX (for simple expressions)
"x^2 + 2x + 1"

// Or number (for numeric results)
42
```

**Key Implementation Files:**
- `app/utils/myScriptClient.ts` - HTTP client with HMAC auth
- `app/utils/myScriptUtils.ts` - Request/response formatting
- `app/utils/recognitionUtils.ts` - Pause detection & recognition manager
- `app/hooks/useRecognition.ts` - React hook for recognition workflow

### Testing Comparison Results

**Endpoint Comparison (Nov 6, 2025):**
- `/batch` (legacy): Lower accuracy, slower recognition
- `/recognize` (latest): ✅ **Significantly better** - "way better" per testing

**Response Format Discovery:**
- `/batch`: Returns JSON with `exports` array
- `/recognize`: Returns plain text string or number (simpler)

---

## 11. References & Resources

### MyScript Documentation
- [MyScript Developer Portal](https://developer.myscript.com)
- [Interactive Ink Documentation](https://developer.myscript.com/docs/interactive-ink)
- [Cloud API Reference](https://cloud.myscript.com/api/v4.0/iink)
- [Swagger API Documentation](https://swaggerui.myscript.com)

### WebSocket Resources
- [iinkJS GitHub (Archived)](https://github.com/MyScript/iinkJS)
- WebSocket Examples: `websocket_math_iink.html`, `websocket_text_iink.html`
- [React Native WebSocket API](https://reactnative.dev/docs/network#websocket-support)

### Related Project Docs
- `MYSCRIPT_SETUP.md` - Initial API setup and authentication
- `PR3_SUMMARY.md` - PR #3 implementation summary
- `ARCHITECTURE.md` - Overall system architecture

---

## 12. Glossary

**Batch Endpoint:** Legacy `/batch` endpoint using older recognition engines. Groups strokes into `strokeGroups` array.

**Recognize Endpoint:** Latest `/recognize` endpoint using newest recognition engines. Uses flat `strokes` array. **Recommended for new projects.**

**iinkJS:** MyScript's archived JavaScript SDK for WebSocket-based handwriting recognition. No longer maintained as of Jan 2024.

**JIIX:** JSON Interactive Ink eXchange - MyScript's native JSON format for representing handwriting and recognition results.

**Pause Detection:** UX pattern where recognition is triggered after user pauses for N milliseconds (250-500ms in our app). Natural batch point for stroke grouping.

**Progressive Recognition:** WebSocket feature where recognition results update in real-time as user draws, before they finish the complete expression.

**HMAC Authentication:** Hash-based Message Authentication Code - security method for signing API requests to prevent tampering.

---

## Appendix: Quick Decision Tree

```
Need handwriting recognition for React Native app?
│
├─ Need real-time feedback DURING drawing? (not after pause)
│  ├─ YES → Consider WebSocket (if worth 40-50h implementation)
│  └─ NO → ✅ Use REST API
│
├─ Implementing gesture recognition (undo/clear/erase)?
│  ├─ YES → Consider WebSocket for immediate gesture detection
│  └─ NO → ✅ Use REST API
│
├─ Collaborative/multi-user drawing?
│  ├─ YES → Use WebSocket
│  └─ NO → ✅ Use REST API
│
├─ Using pause-detection workflow?
│  ├─ YES → ✅ Use REST API (natural fit)
│  └─ NO → Consider WebSocket
│
└─ Default → ✅ **Use REST API with `/recognize` endpoint**
```

---

**Document Version:** 1.0
**Last Updated:** November 6, 2025
**Next Review:** May 2026
