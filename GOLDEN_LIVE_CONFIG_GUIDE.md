# 🎮 Golden Live Player Count Configuration Guide

## සරල විස්තරය (Sinhala)

Golden Live area එකේ "Total Players" count එක automatic වශයෙන් වැඩි වෙන විදිහ configure කරන්න පුළුවන්.

### මොනවද Default Settings?

- **විනාඩියකට වැඩි වෙන ප්‍රමාණය:** 100 සිට 1200 දක්වා (random)
- **Update වෙන වේගය:** සෑම මිලි තත්පර 500 කට වතාවක් (0.5 seconds)
- **එක update එකකින් වැඩි වෙන්නේ:** ~50 සිට 600 දක්වා

### කොහොමද වැඩ කරන්නේ?

```
විනාඩියකට 100-1200 අතර random number එකක් තෝරා ගන්නවා
    ↓
මිලි තත්පර 500ට වතාවක් (0.5 seconds) update කරනවා
    ↓
ඒ අනුව එක update එකකින්:
    = (100-1200) × (500/1000)
    = 50-600 players add වෙනවා
    ↓
Total එක smooth වශයෙන් වැඩි වෙනවා
```

---

## 🎯 Settings වෙනස් කරන්නේ කොහොමද?

### Method 1: Browser Console Use කරලා

**Admin Panel එකෙන් Browser Console Open කරන්න** (F12 හෝ Right-click → Inspect):

#### 1️⃣ දැනට තියෙන settings බලන්න:
```javascript
fetch('/api/admin/golden-live/config', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Current Settings:', data));
```

**Output:**
```json
{
  "minPerSec": 100,
  "maxPerSec": 1200,
  "intervalMs": 500,
  "description": "Currently adding 100-1200 players per second, updating every 500ms"
}
```

#### 2️⃣ Settings වෙනස් කරන්න:

**Example 1: වේගයෙන් වැඩි කරන්න (500-2000/sec)**
```javascript
fetch('/api/admin/golden-live/configure', {
  method: 'POST',
  credentials: 'include',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    minPerSec: 500,
    maxPerSec: 2000,
    intervalMs: 500
  })
})
.then(r => r.json())
.then(data => console.log('Updated:', data));
```

**Example 2: සෙමින් වැඩි කරන්න (50-300/sec)**
```javascript
fetch('/api/admin/golden-live/configure', {
  method: 'POST',
  credentials: 'include',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    minPerSec: 50,
    maxPerSec: 300,
    intervalMs: 1000  // Slower updates (1 second)
  })
})
.then(r => r.json())
.then(data => console.log('Updated:', data));
```

**Example 3: Default වලට reset කරන්න**
```javascript
fetch('/api/admin/golden-live/configure', {
  method: 'POST',
  credentials: 'include',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    minPerSec: 100,
    maxPerSec: 1200,
    intervalMs: 500
  })
})
.then(r => r.json())
.then(data => console.log('Reset to defaults:', data));
```

---

### Method 2: cURL Command Use කරලා (Terminal/Command Line)

**පළමුව admin session cookie එක ගන්න:**
1. Browser එකෙන් admin panel එකට login වෙන්න
2. F12 press කරන්න → Application/Storage tab → Cookies
3. `connect.sid` cookie value එක copy කරන්න

**cURL Commands:**

#### Settings බලන්න:
```bash
curl -X GET http://localhost:5000/api/admin/golden-live/config \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE"
```

#### Settings වෙනස් කරන්න:
```bash
curl -X POST http://localhost:5000/api/admin/golden-live/configure \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "minPerSec": 500,
    "maxPerSec": 2000,
    "intervalMs": 500
  }'
```

---

## 📊 Different Configurations (Examples)

### 1. Conservative (සෙමින් වැඩි වෙන්න)
```json
{
  "minPerSec": 50,
  "maxPerSec": 200,
  "intervalMs": 1000
}
```
- විනාඩියකට: 50-200 players
- Update frequency: සෑම තත්පරයකට
- Use case: Start එකේදී හෝ less active times එකේදී

### 2. Default (සාමාන්‍ය)
```json
{
  "minPerSec": 100,
  "maxPerSec": 1200,
  "intervalMs": 500
}
```
- විනාඩියකට: 100-1200 players
- Update frequency: සෑම 0.5 seconds කට
- Use case: සාමාන්‍ය operation

### 3. Aggressive (වේගවත්)
```json
{
  "minPerSec": 500,
  "maxPerSec": 3000,
  "intervalMs": 300
}
```
- විනාඩියකට: 500-3000 players
- Update frequency: සෑම 0.3 seconds කට
- Use case: Peak hours, promotions, special events

### 4. Super Fast (ඉතා වේගවත්)
```json
{
  "minPerSec": 1000,
  "maxPerSec": 5000,
  "intervalMs": 200
}
```
- විනාඩියකට: 1000-5000 players
- Update frequency: සෑම 0.2 seconds කට
- Use case: Viral moments, big campaigns

### 5. Smooth & Slow (smooth animation)
```json
{
  "minPerSec": 30,
  "maxPerSec": 100,
  "intervalMs": 100
}
```
- විනාඩියකට: 30-100 players
- Update frequency: සෑම 0.1 seconds කට (very smooth)
- Use case: Natural looking increment

---

## 🔢 Parameters Explained

### `minPerSec` (Min Per Second)
- **මොකක්ද:** විනාඩියකට අවම වශයෙන් වැඩි වෙන ප්‍රමාණය
- **Range:** 0 සහ ඊට වැඩි
- **Example:** `minPerSec: 100` = අවම වශයෙන් විනාඩියකට 100 players

### `maxPerSec` (Max Per Second)
- **මොකක්ද:** විනාඩියකට උපරිම වශයෙන් වැඩි වෙන ප්‍රමාණය
- **Range:** minPerSec වලට වඩා වැඩි
- **Example:** `maxPerSec: 1200` = උපරිම වශයෙන් විනාඩියකට 1200 players

### `intervalMs` (Update Interval in Milliseconds)
- **මොකක්ද:** කොපමණ වරක් update කරන්නද (milliseconds එකෙන්)
- **Range:** 100ms සිට 10000ms (0.1-10 seconds)
- **Example:** `intervalMs: 500` = සෑම 0.5 seconds කට update කරනවා

---

## 💡 Calculation Examples

### Example 1: Default Settings
```
minPerSec = 100
maxPerSec = 1200
intervalMs = 500

Per-tick increment:
= Random(100, 1200) × (500/1000)
= Random(100, 1200) × 0.5
= Random(50, 600) players per update

Updates per second: 1000/500 = 2 times
Total per second: ~100-1200 players ✅
```

### Example 2: Fast Settings
```
minPerSec = 500
maxPerSec = 2000
intervalMs = 300

Per-tick increment:
= Random(500, 2000) × (300/1000)
= Random(500, 2000) × 0.3
= Random(150, 600) players per update

Updates per second: 1000/300 = 3.33 times
Total per second: ~500-2000 players ✅
```

---

## 🎮 Real-Time Monitoring

Server logs එකෙන් බලන්න වර්තමාන updates:

```
📊 [Golden Live] Total players updated: 58655 → 58957 (+302)
📊 [Golden Live] Total players updated: 58957 → 59489 (+532)
📊 [Golden Live] Total players updated: 59489 → 60123 (+634)
```

මෙතනින් ඔබට පේන්නේ:
- **Old count** (58655)
- **New count** (58957)
- **Increment** (+302)

---

## ⚙️  Advanced: Batch Configuration Script

```bash
#!/bin/bash

# Set high traffic configuration
curl -X POST http://localhost:5000/api/admin/golden-live/configure \
  -H "Cookie: connect.sid=$ADMIN_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"minPerSec": 1000, "maxPerSec": 3000, "intervalMs": 300}'

echo "High traffic mode activated!"

# Wait 1 hour
sleep 3600

# Reset to normal
curl -X POST http://localhost:5000/api/admin/golden-live/configure \
  -H "Cookie: connect.sid=$ADMIN_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"minPerSec": 100, "maxPerSec": 1200, "intervalMs": 500}'

echo "Reset to normal mode!"
```

---

## 🔒 Security Notes

- ✅ Admin authentication අනිවාර්යයි (`requireAdmin` middleware)
- ✅ Input validation (min < max, reasonable ranges)
- ✅ Settings database එකේ save වෙනවා (persistent)
- ✅ Real-time apply වෙනවා (interval restart)

---

## 📈 Recommended Settings by Use Case

| Use Case | minPerSec | maxPerSec | intervalMs | Description |
|----------|-----------|-----------|------------|-------------|
| Night time | 30 | 150 | 1000 | Low activity |
| Normal hours | 100 | 1200 | 500 | Default |
| Peak hours | 500 | 2000 | 400 | High activity |
| Promotion | 1000 | 3000 | 300 | Special event |
| Going viral | 2000 | 5000 | 200 | Massive traffic |

---

## 🎯 Quick Reference Commands

### Get current config:
```bash
curl http://localhost:5000/api/admin/golden-live/config \
  -H "Cookie: connect.sid=$SESSION"
```

### Set config (විනාඩියකට 100-1200):
```bash
curl -X POST http://localhost:5000/api/admin/golden-live/configure \
  -H "Cookie: connect.sid=$SESSION" \
  -H "Content-Type: application/json" \
  -d '{"minPerSec":100,"maxPerSec":1200,"intervalMs":500}'
```

### Browser console (ඉක්මනින්):
```javascript
// View
fetch('/api/admin/golden-live/config',{credentials:'include'}).then(r=>r.json()).then(console.log)

// Update
fetch('/api/admin/golden-live/configure',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({minPerSec:500,maxPerSec:2000})}).then(r=>r.json()).then(console.log)
```

---

**දැන් ඔබට Golden Live player count එක ඕනෑම විදිහකට configure කරගන්න පුළුවන්!** 🎉

Server restart කරන්න අවශ්‍ය නැහැ - changes instant වශයෙන් apply වෙනවා!
