# PodAI - Mock Mode Quick Start

## 🎭 What is Mock Mode?

Mock mode allows you to test PodAI without calling the expensive Segmind API. Instead of generating real audio, it creates 3-second WAV files with silence for rapid testing and development.

## 🚀 Quick Commands

```bash
# Check current status
make mock_status

# Enable mock mode (free testing)
make mock_on

# Disable mock mode (real API, costs money)
make mock_off

# Test mock mode
make test_mock
```

## 💡 When to Use Each Mode

### Use Mock Mode When:
- ✅ Developing new features
- ✅ Testing the UI/UX
- ✅ Running automated tests
- ✅ Learning how PodAI works
- ✅ Debugging issues

### Use Real API Mode When:
- 💸 Generating production-quality audio
- 💸 Final testing before deployment
- 💸 Demonstrating to clients/users
- 💸 Creating actual podcast episodes

## 🔄 Toggle Methods

### 1. Web UI Toggle
- Visit http://localhost:5173
- Use the "Development Mode" toggle at the top
- Real-time status indicators show current mode

### 2. Command Line
```bash
# Via make commands
make mock_on    # Enable
make mock_off   # Disable
make mock_status # Check

# Via Python script
python toggle_mock.py on     # Enable
python toggle_mock.py off    # Disable
python toggle_mock.py status # Check
```

### 3. Environment Variable
```bash
# Edit .env file
PODCAST_MOCK_MODE=true   # Enable mock mode
PODCAST_MOCK_MODE=false  # Disable mock mode
```

### 4. API Endpoints
```bash
# Check status
curl http://localhost:8000/api/podcast/mock-status

# Toggle mode
curl -X POST -H "Content-Type: application/json" \
  -d '{"enabled": true, "delay_seconds": 2.0}' \
  http://localhost:8000/api/podcast/mock-toggle
```

## 📊 Status Indicators

The UI shows clear indicators:
- 🎭 **MOCK** - Mock mode active (free, instant)
- 🚀 **REAL** - Real API mode (costs money)
- **API Key ✓** - Segmind API key is configured
- **API Key ✗** - Segmind API key missing

## 🎵 Mock Audio Files

Mock files are saved to `/temp/` with:
- **Format**: WAV (44.1kHz, 16-bit, mono)
- **Duration**: 3 seconds of silence
- **Size**: ~265KB
- **Playable**: Yes, works in browsers and audio players

## 💰 Cost Savings

Mock mode prevents API charges during:
- Feature development
- Bug testing
- UI/UX iteration
- Learning and experimentation
- Automated testing

## 🔧 Troubleshooting

**Mock mode not working?**
- Restart backend: `Ctrl+C` then `make run_backend`
- Check .env file: `grep PODCAST_MOCK_MODE .env`
- Verify status: `make mock_status`

**Real API not working?**
- Check API key: Set `SEGMIND_API_KEY` in .env
- Disable mock mode: `make mock_off`
- Check server logs for errors

## 🚀 Ready to Start?

1. **Enable mock mode**: `make mock_on`
2. **Start servers**: `make dev` (or run backend/frontend separately)
3. **Open browser**: http://localhost:5173
4. **Test upload**: Upload a PDF and generate a podcast
5. **Toggle modes**: Use the UI switch to compare mock vs real

The mock system is now fully set up and ready for testing! 🎉
