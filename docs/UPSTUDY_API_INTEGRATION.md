# UpStudy API Integration (Formerly CameraMath)

**Date Updated:** 2025-01-06
**API Documentation:** https://developers.cameramath.com/docs

## Overview

The validation system integrates with UpStudy API (formerly CameraMath) to validate math problem solutions. The API provides step-by-step solutions which we compare against student work.

## API Details

### Base URL
```
https://api.cameramath.com/v1
```

### Authentication
- **Method:** API Key in header
- **Header:** `Authorization: YOUR_API_KEY`
- **No "Bearer" prefix**

### Endpoints Used

#### 1. Show Steps (Primary)
- **URL:** `/show-steps`
- **Method:** POST
- **Purpose:** Get detailed step-by-step solution
- **Request:**
  ```json
  {
    "input": "x + 5 = 12",
    "lang": "EN"
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "input": "x + 5 = 12",
      "solution": { ... },
      "solving_steps": [
        {
          "latex": "x + 5 - 5 = 12 - 5",
          "description": "Subtract 5 from both sides",
          "result": "x = 7"
        }
      ]
    },
    "err_msg": null
  }
  ```

#### 2. Single Answer (Optional)
- **URL:** `/single-answer`
- **Method:** POST
- **Purpose:** Quick answer without steps

#### 3. Brief Answers (Optional)
- **URL:** `/brief-answers`
- **Method:** POST
- **Purpose:** Overview for each topic

### Rate Limits
- **Limit:** 30 requests per minute
- **Status Code:** 429 (Too Many Requests) when exceeded
- **Our Config:** Enforced locally with rate limiting

### Error Codes
| Code | Description | Solution |
|------|-------------|----------|
| 400 | Invalid Request | Check request parameters |
| 401 | Unauthorized | Verify API key |
| 429 | Too Many Requests | Enforce rate limiting |
| 500 | Server Error | Retry with backoff |

## Validation Strategy

Since UpStudy API solves problems rather than validating individual steps, we use a hybrid approach:

### 1. API-First Validation
1. Send problem to `/show-steps`
2. Extract `solving_steps` from response
3. Normalize and compare student's step against solution steps
4. If match found: **Correct & Useful** ✅

### 2. Local Fallback Validation
If API call fails or no match found:
1. Compare against hardcoded `expectedSteps` in problem data
2. Use local `normalizeLaTeX()` for comparison
3. Check for tautologies (e.g., adding 0)
4. Classify error type (syntax, arithmetic, logic, method)

### 3. Caching Strategy
- Cache API responses for 7 days in MMKV
- Cache key: `MD5(problemId + stepNumber + latex)`
- Target: 70%+ cache hit rate to minimize API costs

## Implementation Files

### API Configuration
- **File:** `app/utils/apiConfig.ts`
- **Key Functions:**
  - `getCameraMathHeaders()` - Build auth headers
  - `checkRateLimit()` - Enforce 30 req/min limit
  - `apiRequestWithRetry()` - Exponential backoff (3 attempts)

### Validation Logic
- **File:** `app/utils/mathValidation.ts`
- **Key Functions:**
  - `callCameraMathAPI()` - Make API request
  - `parseCameraMathResponse()` - Parse solution steps
  - `validateMathStep()` - Main validation entry point
  - `normalizeLaTeX()` - Normalize for comparison

### Storage Layer
- **File:** `app/utils/storage.ts`
- **Key Functions:**
  - `cacheValidationResult()` - Store with TTL
  - `getCachedValidationResult()` - Retrieve & check expiry

## Configuration

### Environment Variables (.env)
```bash
# UpStudy API (formerly CameraMath)
CAMERAMATH_API_KEY=your_api_key_here
CAMERAMATH_API_URL=https://api.cameramath.com/v1
CAMERAMATH_TIMEOUT_MS=5000
CAMERAMATH_ENABLE_CACHING=true
```

### Rate Limit Settings
```typescript
maxRequestsPerMinute: 30  // UpStudy limit
debounceMs: 500           // Prevent duplicate requests
```

### Retry Configuration
```typescript
maxRetries: 3
retryDelay: 1000ms        // Initial delay
backoffMultiplier: 2      // Exponential: 1s, 2s, 4s
```

## Cost Management

### Free Tier
- **Credits:** $10 free credits
- **Estimated:** ~200-500 validation calls
- **MVP Target:** Sufficient for testing all 25 problems

### Cost Optimization
1. **Caching:** 70%+ cache hit rate reduces API calls
2. **Rate Limiting:** Prevents accidental overuse
3. **Local Fallback:** Works without API
4. **Debouncing:** Prevents duplicate requests

### Monitoring
- Track via `getCacheStats()` in storage utility
- Logs cache hits/misses for optimization
- Monitor API error rates in validation store

## Supported Languages

The API supports multiple languages via `lang` parameter:
- EN (English) - **Default**
- ES (Spanish)
- FR (French)
- DE (German)
- IT (Italian)
- PT (Portuguese)
- RU (Russian)
- ZHS (Chinese Simplified)
- ZHT (Chinese Traditional)
- JA (Japanese)
- KO (Korean)
- HI (Hindi)
- VI (Vietnamese)
- PL (Polish)

Currently hardcoded to `"EN"` in validation logic.

## Testing

### Manual Test
1. Run app: `npx react-native run-ios`
2. Write math expression: "x + 5 = 12"
3. Wait for recognition
4. Click "Validate Step 1"
5. Check console logs for API request/response

### Expected Console Output
```
[Validation] Calling UpStudy API (show-steps): https://api.cameramath.com/v1/show-steps
[Validation] Request payload: {"input":"x + 5 = 12","lang":"EN"}
[Validation] UpStudy API response: { "data": {...}, "err_msg": null }
[Validation] Parsing UpStudy API response...
[ValidationStore] Validation complete: true true
```

### Error Scenarios
- **401 Unauthorized:** Check API key in .env
- **429 Rate Limited:** Wait 1 minute, check rate limiting
- **Network Error:** Falls back to local validation
- **No Match:** Uses hardcoded expectedSteps

## Future Upgrades

### Production Considerations
1. **Upgrade to Wolfram Alpha** for more accurate validation
2. **Implement batch validation** for multiple steps
3. **Add confidence thresholds** to filter low-confidence results
4. **Multi-language support** for international students
5. **Custom hints** based on error patterns

### Performance Optimization
1. **Preload solutions** for all 25 problems on app start
2. **Cache warming** for common problems
3. **Parallel validation** for multiple steps
4. **WebSocket** for real-time validation

## Troubleshooting

### API Key Issues
```bash
# Error: Missing CAMERAMATH_API_KEY
# Solution: Add to .env file
CAMERAMATH_API_KEY=your_key_here
```

### Rate Limit Exceeded
```bash
# Error: Rate limit exceeded
# Solution: Implement request queuing or increase debounce
```

### Network Errors
```bash
# Error: Network request failed
# Solution: Check internet connection, falls back to local validation
```

### Parsing Errors
```bash
# Error: Cannot read property 'solving_steps' of undefined
# Solution: Check API response structure, update parsing logic
```

## Contact

- **API Support:** [email protected]
- **Documentation:** https://developers.cameramath.com/docs
- **Rate Limit Increases:** Contact support
