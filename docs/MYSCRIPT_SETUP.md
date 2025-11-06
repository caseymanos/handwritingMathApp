# MyScript Cloud API Setup Guide

This document explains how to set up and use MyScript Cloud API for handwriting recognition in the Handwriting Math App.

## Overview

**Decision:** We chose **MyScript Cloud API** over Google ML Kit for MVP due to:
- ✅ **Faster MVP development**: Simple REST API vs complex native bridge
- ✅ **Superior math recognition**: Purpose-built for mathematical notation
- ✅ **Direct LaTeX output**: No parsing needed
- ✅ **Free tier**: 2,000 requests/month (sufficient for MVP testing)
- ✅ **Easy integration**: No native code required

**Trade-off:** Requires internet connection (offline requirement dropped for MVP)

## Account Setup

### 1. Create MyScript Developer Account

1. Go to [https://developer.myscript.com](https://developer.myscript.com)
2. Click "Sign Up" and create an account
3. Verify your email address
4. Log in to the developer portal

### 2. Create an Application

1. Navigate to "Applications" in the developer portal
2. Click "New Application"
3. Fill in:
   - **Application Name**: `Handwriting Math App - MVP`
   - **Description**: `Tablet app for handwriting math problem solving`
4. Save the application

### 3. Get API Credentials

After creating your application, you'll receive:

- **Application Key**: Public identifier for your app
- **HMAC Key** (optional): For request signing/authentication

### 4. Configure Environment Variables

Copy your credentials to `.env`:

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and add your credentials:
MYSCRIPT_APPLICATION_KEY=your_actual_application_key_here
MYSCRIPT_HMAC_KEY=your_actual_hmac_key_here  # Optional
```

**Note:** For initial testing, you can disable HMAC authentication in your MyScript application settings.

## Architecture

### Files Created (PR3)

```
app/
├── types/
│   └── MyScript.ts                    # TypeScript types for API
├── utils/
│   ├── myScriptUtils.ts               # Stroke conversion utilities
│   ├── myScriptClient.ts              # API client with HMAC auth
│   └── recognitionUtils.ts            # Pause detection, line splitting
├── stores/
│   └── canvasStore.ts                 # Zustand state management
└── components/
    ├── RecognitionIndicator.tsx       # Recognition status UI
    └── ManualInputFallback.tsx        # Manual input fallback
```

### Data Flow

```
User draws stroke
  ↓
HandwritingCanvas captures points {x, y, pressure, timestamp}
  ↓
On pause (500ms), trigger recognition
  ↓
Convert strokes: Stroke[] → MyScriptStroke[]
  ↓
POST to MyScript API /api/v4.0/iink/batch
  ↓
Receive LaTeX, MathML, plain text
  ↓
Update Zustand store → UI updates
  ↓
Display RecognitionIndicator with result
```

## Usage

### Basic Recognition Example

```typescript
import { MyScriptClient } from './utils/myScriptClient';
import { RecognitionManager } from './utils/recognitionUtils';
import { createRecognitionRequest } from './utils/myScriptUtils';

// Initialize client
const client = new MyScriptClient({
  applicationKey: process.env.MYSCRIPT_APPLICATION_KEY,
  hmacKey: process.env.MYSCRIPT_HMAC_KEY, // Optional
});

// Create recognition manager
const manager = new RecognitionManager(client, {
  pauseDuration: 500,      // Trigger after 500ms pause
  minConfidence: 0.85,     // 85% confidence threshold
  useHMAC: false,          // Disable HMAC for testing
});

// Recognize strokes
const result = await manager.recognizeStrokes(strokes);

if (result.status === 'success') {
  console.log('LaTeX:', result.latex);
  console.log('Confidence:', result.confidence);
}
```

### Using with Zustand Store

```typescript
import { useCanvasStore } from './stores/canvasStore';

function MyComponent() {
  const strokes = useCanvasStore(state => state.strokes);
  const recognitionResult = useCanvasStore(state => state.recognitionResult);
  const setIsRecognizing = useCanvasStore(state => state.setIsRecognizing);

  const handleRecognize = async () => {
    setIsRecognizing(true);
    const result = await manager.recognizeStrokes(strokes);
    useCanvasStore.getState().setRecognitionResult(result);
    setIsRecognizing(false);
  };

  return (
    <View>
      <RecognitionIndicator />
      {recognitionResult?.latex && (
        <Text>{recognitionResult.latex}</Text>
      )}
    </View>
  );
}
```

## API Details

### Request Format

```json
{
  "contentType": "Math",
  "configuration": {
    "lang": "en_US",
    "export": {
      "jiix": {
        "strokes": true,
        "bounding-box": true
      }
    }
  },
  "strokeGroups": [{
    "strokes": [{
      "id": "stroke-1",
      "x": [10, 20, 30],
      "y": [10, 15, 20],
      "t": [1234567890000, 1234567890100, 1234567890200],
      "p": [0.5, 0.7, 0.6],
      "pointerId": 0,
      "pointerType": "PEN"
    }]
  }],
  "mimeTypes": [
    "application/x-latex",
    "application/mathml+xml",
    "text/plain"
  ]
}
```

### Response Format

```json
{
  "exports": [
    {
      "mime-type": "application/x-latex",
      "data": "2x + 3 = 7"
    },
    {
      "mime-type": "application/mathml+xml",
      "data": "<math>...</math>"
    },
    {
      "mime-type": "text/plain",
      "data": "2x + 3 = 7"
    }
  ],
  "confidence": {
    "overall": 0.92
  }
}
```

## Testing

### Test API Connection

```typescript
import { getMyScriptClient } from './utils/myScriptClient';

const client = getMyScriptClient();
const isConnected = await client.testConnection();

if (isConnected) {
  console.log('✓ MyScript API connection successful');
} else {
  console.error('✗ MyScript API connection failed');
}
```

### Test Recognition with Sample Strokes

```typescript
// Create simple test stroke (drawing "2")
const testStroke: Stroke = {
  id: 'test-1',
  points: [
    { x: 10, y: 10, pressure: 0.5, timestamp: Date.now() },
    { x: 20, y: 10, pressure: 0.6, timestamp: Date.now() + 50 },
    { x: 20, y: 30, pressure: 0.5, timestamp: Date.now() + 100 },
  ],
  color: '#000000',
  strokeWidth: 2,
  timestamp: Date.now(),
};

const result = await manager.recognizeStrokes([testStroke]);
console.log('Result:', result);
```

## Configuration

### Recognition Config

```typescript
interface RecognitionConfig {
  pauseDuration: number;           // Default: 500ms
  minConfidence: number;            // Default: 0.85 (85%)
  maxStrokesPerRecognition: number; // Default: 50
  debounceDuration: number;         // Default: 500ms
  useHMAC: boolean;                 // Default: false
}
```

Update config:
```typescript
manager.updateConfig({
  pauseDuration: 750,    // Longer pause
  minConfidence: 0.90,   // Higher confidence threshold
});
```

## Troubleshooting

### Common Issues

**1. Authentication Error (401/403)**
- Check that `MYSCRIPT_APPLICATION_KEY` is correct
- Verify HMAC key if enabled
- Try disabling HMAC in MyScript portal temporarily

**2. Invalid Request (400)**
- Ensure strokes have valid data (at least 2 points)
- Check that arrays (x, y, t, p) have same length
- Verify stroke data is not empty

**3. Network Error**
- Check internet connection
- Verify firewall allows https://cloud.myscript.com
- Check if API is down: https://status.myscript.com

**4. Low Confidence (<85%)**
- Handwriting may be unclear
- Try writing more neatly
- Use manual input fallback
- Adjust `minConfidence` threshold

**5. Timeout Error**
- API took > 10 seconds
- Try with fewer strokes
- Check network speed

### Debug Mode

Enable detailed logging:

```typescript
const client = new MyScriptClient({
  applicationKey: process.env.MYSCRIPT_APPLICATION_KEY,
  timeout: 20000, // Increase timeout to 20s for debugging
});

// Log requests
console.log('Sending request:', request);

// Log responses
console.log('Received response:', response);
```

## Limits & Pricing

### Free Tier
- **2,000 requests/month** (sufficient for MVP)
- No credit card required
- Perfect for development and testing

### After MVP
- Contact MyScript for commercial pricing
- Or consider migration to offline solution (ML Kit, custom model)

## Next Steps for Integration

### 1. Integrate into HandwritingCanvas

```typescript
// In HandwritingCanvas.tsx, add:
const canvasStore = useCanvasStore();
const recognitionManager = useRecognitionManager();

// On stroke complete:
const handleStrokeComplete = (stroke: Stroke) => {
  canvasStore.addStroke(stroke);

  // Start pause detection timer
  recognitionManager.startPauseDetection(async () => {
    // Trigger recognition after pause
    canvasStore.setIsRecognizing(true);
    const result = await recognitionManager.recognizeStrokes(
      canvasStore.strokes
    );
    canvasStore.setRecognitionResult(result);
    canvasStore.setIsRecognizing(false);
  });
};
```

### 2. Add to CanvasDemoScreen

```typescript
import { RecognitionIndicator } from '../components/RecognitionIndicator';
import { ManualInputFallback } from '../components/ManualInputFallback';

<View>
  <RecognitionIndicator />
  <HandwritingCanvas onStrokeComplete={handleStrokeComplete} />
  <ManualInputFallback
    visible={showManualInput}
    onSubmit={handleManualInput}
    onCancel={() => setShowManualInput(false)}
  />
</View>
```

### 3. Test with Real Handwriting

1. Build and run on iPad
2. Write simple equations: `2x + 3 = 7`
3. Verify LaTeX output
4. Test confidence scores
5. Validate <2s response time

## Resources

- **MyScript Developer Portal**: https://developer.myscript.com
- **API Documentation**: https://developer.myscript.com/docs
- **Swagger UI**: https://swaggerui.myscript.com
- **Support Forum**: https://developer-support.myscript.com

## Success Criteria (PR3)

- ✅ MyScript API client implemented
- ✅ Stroke conversion utilities complete
- ✅ Zustand store for recognition state
- ✅ Recognition utilities (pause detection)
- ✅ UI components (indicator, fallback)
- ⏳ Integration with HandwritingCanvas (next step)
- ⏳ Testing with real handwriting samples
- ⏳ Validate >85% accuracy target
- ⏳ Validate <2s response time

**Status**: Core infrastructure complete, ready for integration and testing.
