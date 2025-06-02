# Mock Mode Documentation

## Overview

PodAI includes a mock mode system to avoid expensive Segmind API calls during development and testing. Mock mode creates fake audio files instantly without consuming API credits.

## Features

- 🎭 **Mock Mode**: Creates 3-second WAV files with silence for testing
- 🚀 **Real Mode**: Uses actual Segmind API for production-quality audio
- ⚡ **Instant Results**: Mock processing takes only 2 seconds (configurable)
- 💰 **Cost Control**: Avoid API charges during development
- 🔄 **Easy Toggle**: Switch modes via UI, command line, or environment variables

## Configuration

### Environment Variables

```bash
# Enable/disable mock mode
PODCAST_MOCK_MODE=true    # or false

# Processing delay in mock mode (seconds)
PODCAST_MOCK_DELAY=2.0

# Environment type
ENVIRONMENT=development
```

### Command Line

```bash
# Enable mock mode
make mock_on

# Disable mock mode
make mock_off

# Check current status
make mock_status

# Test with mock mode
make test_mock
```

### Python Script

```bash
python toggle_mock.py on     # Enable mock mode
python toggle_mock.py off    # Disable mock mode
python toggle_mock.py status # Show current status
```

## UI Toggle

The frontend includes a mock mode toggle in the main interface:

- **Mock Mode ON**: 🎭 Creates fake audio files instantly
- **Mock Mode OFF**: 🚀 Uses real Segmind API (costs money)
- **Status Indicators**: Shows current mode and API key availability

## Mock Audio Files

Mock mode creates:
- **Format**: WAV (44.1kHz, 16-bit, mono)
- **Duration**: 3 seconds of silence
- **Size**: ~265KB
- **Location**: `/temp/mock_podcast_[timestamp]_[id].wav`

Additional files created:
- `mock_metadata_[timestamp]_[id].json` - Contains processing metadata

## API Endpoints

- `GET /api/podcast/mock-status` - Get current mock mode status
- `POST /api/podcast/mock-toggle` - Toggle mock mode (session only)

## Development Workflow

1. **Default**: Start with mock mode enabled (`PODCAST_MOCK_MODE=true`)
2. **Testing**: Use mock mode for rapid iteration and testing
3. **Validation**: Occasionally test with real API to verify functionality
4. **Production**: Deploy with mock mode disabled

## Cost Savings

Mock mode helps avoid costs by:
- Eliminating API calls during development
- Reducing charges during testing cycles
- Allowing unlimited experimentation
- Preserving API credits for actual production use

## Troubleshooting

### Mock Mode Not Working
- Check environment variable: `echo $PODCAST_MOCK_MODE`
- Restart the backend server after changing `.env`
- Verify mock status via API: `curl http://localhost:8000/api/podcast/mock-status`

### Real API Not Working
- Verify `SEGMIND_API_KEY` is set correctly
- Check API key validity
- Ensure mock mode is disabled
- Review server logs for API response errors

## Production Deployment

For production:
1. Set `PODCAST_MOCK_MODE=false`
2. Ensure `SEGMIND_API_KEY` is valid
3. Set `ENVIRONMENT=production`
4. Remove or comment out mock mode UI toggles
