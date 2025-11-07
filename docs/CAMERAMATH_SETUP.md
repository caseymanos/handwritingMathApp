# CameraMath API Setup Guide

This document provides step-by-step instructions for setting up the CameraMath API for math validation in the Handwriting Math App.

## Overview

CameraMath is a professional math solver API that provides:
- Step-by-step solution validation
- Correctness and usefulness assessment
- Mathematical error detection and classification
- Suggested next steps for hints

**MVP Tier**: $10 free credits (~200-500 validation calls)
**Future Upgrade**: Wolfram Alpha API for production scale

---

## Step 1: Create CameraMath Account

1. Visit the CameraMath Developer Portal:
   - **URL**: https://www.cameramath.com/ (look for "API" or "Developers" link)
   - **Alternative**: https://api.cameramath.com/
   - **Support**: Contact support@cameramath.com if developer docs are not visible

2. Sign up for a developer account:
   - Create account with your email
   - Verify email address
   - Complete developer profile

3. Navigate to API dashboard:
   - Look for "API Keys" or "Credentials" section
   - Create new API key for "Handwriting Math App - MVP"

4. Save your API key securely (you'll need it in Step 3)

---

## Step 2: Study API Documentation

Once logged into the CameraMath developer portal, review the following:

### Key Information to Gather:
1. **Base URL**:
   - Example: `https://api.cameramath.com/v1` or similar

2. **Authentication Method**:
   - Header format (likely `Authorization: Bearer YOUR_API_KEY`)
   - Or query parameter format (e.g., `?api_key=YOUR_API_KEY`)

3. **Endpoints**:
   - **Solve Equation**: POST `/solve` or `/equation`
   - **Validate Step**: POST `/validate` or `/check-step`
   - **Get Hints**: POST `/hints` or `/suggest`

4. **Request Format** (example):
   ```json
   {
     "problem": "2x + 3 = 11",
     "student_step": "2x = 8",
     "step_number": 2,
     "context": "linear_equations"
   }
   ```

5. **Response Format** (example):
   ```json
   {
     "correct": true,
     "useful": true,
     "explanation": "Correctly subtracted 3 from both sides",
     "next_steps": ["Divide both sides by 2"],
     "complete_solution": [...]
   }
   ```

6. **Rate Limits**:
   - Requests per minute/hour
   - Free tier quota

7. **Error Codes**:
   - 400: Bad request (invalid LaTeX)
   - 401: Unauthorized (invalid API key)
   - 429: Rate limit exceeded
   - 500: Server error

---

## Step 3: Configure Environment Variables

1. Open `.env` file in project root (create if it doesn't exist):
   ```bash
   # Copy from .env.example
   cp .env.example .env
   ```

2. Add your CameraMath credentials:
   ```env
   # CameraMath API Configuration
   CAMERAMATH_API_KEY=your_actual_api_key_here
   CAMERAMATH_API_URL=https://api.cameramath.com/v1
   CAMERAMATH_TIMEOUT=5000
   ```

3. **IMPORTANT**: Never commit `.env` to git!
   - Verify `.env` is in `.gitignore`
   - Only commit `.env.example` with placeholder values

---

## Step 4: Verify API Access

Test your API key with a simple curl request:

```bash
curl -X POST https://api.cameramath.com/v1/solve \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "problem": "x + 5 = 12",
    "format": "latex"
  }'
```

Expected response (example):
```json
{
  "status": "success",
  "solution": {
    "answer": "x = 7",
    "steps": [
      {
        "step": 1,
        "expression": "x + 5 - 5 = 12 - 5",
        "operation": "subtract 5 from both sides"
      },
      {
        "step": 2,
        "expression": "x = 7",
        "operation": "simplify"
      }
    ]
  }
}
```

---

## Step 5: Integration Points

The app uses CameraMath API in the following flow:

1. **User Input**:
   - User writes equation on canvas (e.g., "2x = 8")
   - MyScript recognizes handwriting → LaTeX format

2. **Validation Request**:
   - `app/utils/mathValidation.ts` sends LaTeX to CameraMath
   - Includes problem context (current problem being solved)
   - Includes step number (1st step, 2nd step, etc.)

3. **Response Processing**:
   - Parse CameraMath response
   - Determine: Correct & Useful | Correct but Not Useful | Incorrect
   - Extract error type and hints

4. **Caching**:
   - MMKV caches validation results
   - Cache key: `{problemId}_{stepNumber}_{latexHash}`
   - Reduces redundant API calls (saves costs)

5. **UI Feedback**:
   - `ValidationFeedback.tsx` displays result
   - ✅ Green checkmark for correct & useful
   - ⚠️ Yellow warning for correct but not useful
   - ❌ Red X for incorrect with hint

---

## Cost Management

### Free Tier ($10 credits):
- Estimated 200-500 validation calls
- Sufficient for MVP development and testing
- Monitor usage in CameraMath dashboard

### Optimization Strategies:
1. **Aggressive Caching**: Store all validation results locally
2. **Debouncing**: Max 1 API call per 500ms
3. **Batch Testing**: Use mock responses for unit tests
4. **Confidence Threshold**: Only validate high-confidence recognition (>85%)

### Future Upgrade Path:
- **Production Scale**: Migrate to Wolfram Alpha API
- **Estimated Cost**: $500-1,000/month for 10,000+ students
- **Timeline**: Post-MVP (PR12+)

---

## Troubleshooting

### Issue: "401 Unauthorized"
**Solution**:
- Verify API key is correct in `.env`
- Check API key is active in CameraMath dashboard
- Ensure authorization header format is correct

### Issue: "429 Rate Limit Exceeded"
**Solution**:
- Implement exponential backoff in `mathValidation.ts`
- Increase debounce delay (500ms → 1000ms)
- Verify caching is working (check MMKV logs)

### Issue: "Invalid LaTeX format"
**Solution**:
- Check MyScript recognition output
- Normalize LaTeX before sending (remove extra whitespace)
- Handle special characters properly (escape if needed)

### Issue: API is slow (>3 seconds)
**Solution**:
- Check internet connection
- Reduce timeout setting (currently 5000ms)
- Implement loading indicator in UI
- Consider caching more aggressively

---

## API Response Examples

### Example 1: Correct & Useful Step
**Request**:
```json
{
  "problem": "2x + 3 = 11",
  "step": "2x = 8",
  "step_number": 2
}
```

**Response**:
```json
{
  "correct": true,
  "useful": true,
  "feedback": "Good! You correctly subtracted 3 from both sides.",
  "next_step": "Now divide both sides by 2 to isolate x"
}
```

### Example 2: Correct but Not Useful Step
**Request**:
```json
{
  "problem": "2x + 3 = 11",
  "step": "2x + 3 + 0 = 11 + 0",
  "step_number": 1
}
```

**Response**:
```json
{
  "correct": true,
  "useful": false,
  "feedback": "This step is mathematically correct, but it doesn't help solve the equation. Try a different operation.",
  "hint": "Think about what you can do to isolate the term with x"
}
```

### Example 3: Incorrect Step
**Request**:
```json
{
  "problem": "2x + 3 = 11",
  "step": "2x = 14",
  "step_number": 2
}
```

**Response**:
```json
{
  "correct": false,
  "useful": false,
  "error_type": "arithmetic",
  "feedback": "This step is incorrect. Check your arithmetic when subtracting from both sides.",
  "hint": "What is 11 - 3?"
}
```

---

## Related Files

- `app/utils/apiConfig.ts` - API configuration and base URL
- `app/utils/mathValidation.ts` - Validation orchestration logic
- `app/stores/validationStore.ts` - Zustand state management
- `app/types/Validation.ts` - TypeScript interfaces for validation
- `.env.example` - Environment variable template

---

## Support

- **CameraMath Support**: support@cameramath.com
- **Documentation**: Check CameraMath developer portal
- **Project Contact**: Rafal Szulejko (rafal.szulejko@superbuilders.school)
