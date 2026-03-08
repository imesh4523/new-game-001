# 🚀 VPS එකට App එක Deploy කරන්න - සම්පූර්ණ Guide

## 📋 ඔයාට ඕන දේවල්:
1. VPS account එකක් (Oracle, AWS, DigitalOcean, etc.)
2. SSH access (VPS provider එක දෙන username සහ password/key)
3. FileZilla වගේ FTP software එකක් (files upload කරන්න)

---

## පියවර 1️⃣: Code එක Download කරන්න

### Replit එකෙන්:
1. Replit project එකේ **Files** tab එක open කරන්න
2. Top left corner එකේ **three dots** (⋮) click කරන්න
3. **"Download as zip"** select කරන්න
4. ZIP file එක save කරන්න

---

## පියවර 2️⃣: VPS එකට Connect වෙන්න

### Windows භාවිතා කරන්නවා නම්:
1. **PuTTY** download කරන්න: https://www.putty.org/
2. PuTTY open කරන්න
3. Host Name එකේ ඔයාගේ VPS IP එක type කරන්න
4. Port: `22`
5. **Open** click කරන්න
6. Username සහ password enter කරන්න

### Mac/Linux භාවිතා කරන්නවා නම්:
Terminal එකේ මේ command run කරන්න:
```bash
ssh username@your-vps-ip
# Example: ssh root@123.456.789.10
```
Password එක type කරන්න (type කරද්දී දැකෙන්නේ නෑ - normal එකක්)

---

## පියවර 3️⃣: VPS එකේ Requirements Install කරන්න

SSH එකට connect උනාම මේ commands copy paste කරන්න:

```bash
# System update කරන්න
sudo apt update && sudo apt upgrade -y

# Node.js install කරන්න (version 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL install කරන්න
sudo apt-get install -y postgresql postgresql-contrib

# Unzip tool install කරන්න
sudo apt-get install -y unzip

# PM2 install කරන්න (app එක always-on කරන්න)
sudo npm install -g pm2

# Check කරන්න හරියට install උනාද
node --version  # v20.x.x එන ඕනේ
npm --version   # 10.x.x එන ඕනේ
```

---

## පියවර 4️⃣: ZIP File එක VPS එකට Upload කරන්න

### Option A: FileZilla Use කරන්න (Easy!)

1. **FileZilla** download කරන්න: https://filezilla-project.org/
2. FileZilla open කරන්න
3. Top bar එකේ:
   - **Host**: `sftp://your-vps-ip`
   - **Username**: ඔයාගේ VPS username (බොහෝ විට `root`)
   - **Password**: ඔයාගේ VPS password
   - **Port**: `22`
4. **Quickconnect** click කරන්න
5. Right side එකේ `/home` folder එකට යන්න
6. Left side එකෙන් ZIP file එක drag කරලා right side එකට drop කරන්න
7. Upload වෙන තුරු wait කරන්න

### Option B: Direct Upload (Advanced)

Windows PowerShell / Mac Terminal එකෙන්:
```bash
scp /path/to/your/project.zip username@your-vps-ip:/home/
# Example: scp C:\Downloads\project.zip root@123.456.789.10:/home/
```

---

## පියවර 5️⃣: ZIP එක Unzip කරන්න

SSH terminal එකේ:
```bash
# Home folder එකට යන්න
cd /home

# ZIP file එක unzip කරන්න
unzip project.zip

# Unzip උන folder එකට යන්න (name එක check කරන්න)
ls  # folders list එක බලන්න
cd workspace  # නැත්නම් ඔයාගේ folder name එක
```

---

## පියවර 6️⃣: Database Setup කරන්න

```bash
# PostgreSQL service start කරන්න
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Database user එකක් හදන්න
sudo -u postgres psql -c "CREATE USER myappuser WITH PASSWORD 'strong_password_123';"

# Database එකක් හදන්න
sudo -u postgres psql -c "CREATE DATABASE myappdb OWNER myappuser;"

# Database URL එක set කරන්න
export DATABASE_URL="postgresql://myappuser:strong_password_123@localhost:5432/myappdb"

# මේක permanent කරන්න:
echo 'export DATABASE_URL="postgresql://myappuser:strong_password_123@localhost:5432/myappdb"' >> ~/.bashrc
source ~/.bashrc
```

---

## පියවර 7️⃣: App එක Setup කරන්න

```bash
# Project folder එකේ තියනවාද check කරන්න
pwd  # /home/workspace එන ඕනේ

# Dependencies install කරන්න (මේකට විනාඩි 2-3ක් යන්න පුළුවන්)
npm install

# Database tables හදන්න
npm run db:push

# App එක build කරන්න
npm run build
```

---

## පියවර 8️⃣: App එක Start කරන්න

### Test කරන්න පළමුව:
```bash
# Development mode එකේ run කරන්න (test කරන්න විතරයි)
npm run dev
```

Browser එකේ: `http://your-vps-ip:5000` එන්න try කරන්න

**වැඩ කරනවා නම්**, `Ctrl+C` press කරලා stop කරන්න.

### Production Mode (Always-On):

```bash
# PM2 එකෙන් start කරන්න
pm2 start npm --name "my-gaming-app" -- start

# Auto-start setup කරන්න (VPS restart උනත් app එක auto start වෙන්න)
pm2 startup
pm2 save

# Check කරන්න running වෙනවාද
pm2 status
pm2 logs my-gaming-app  # logs බලන්න
```

---

## පියවර 9️⃣: Firewall Setup කරන්න (Port 5000 Open කරන්න)

```bash
# UFW firewall enable කරන්න
sudo ufw allow 22    # SSH
sudo ufw allow 5000  # App port
sudo ufw enable
sudo ufw status
```

---

## 🎉 DONE! App එක Access කරන්න

Browser එකේ:
```
http://your-vps-ip:5000
```

Example: `http://123.456.789.10:5000`

---

## 🔧 Useful Commands:

### App එක manage කරන්න:
```bash
pm2 list              # Running apps list එක
pm2 stop my-gaming-app    # App එක stop කරන්න
pm2 restart my-gaming-app # App එක restart කරන්න
pm2 logs my-gaming-app    # Logs බලන්න
pm2 delete my-gaming-app  # App එක remove කරන්න
```

### Database manage කරන්න:
```bash
# Database එකට connect වෙන්න
sudo -u postgres psql myappdb

# Database commands:
\dt              # Tables list එක
\q               # Exit කරන්න
```

### App එක update කරන්න (code එක change කරලා නම්):
```bash
cd /home/workspace
# New ZIP එක upload කරන්න FileZilla එකෙන්
unzip -o new-project.zip  # Override existing files
npm install               # New dependencies install කරන්න
npm run build            # Re-build කරන්න
pm2 restart my-gaming-app # Restart කරන්න
```

---

## 🆓 Free Domain එකක් Connect කරන්න (Optional)

### DuckDNS භාවිතා කරන්න:

1. https://www.duckdns.org වලට යන්න
2. Sign in කරන්න (Google account එකෙන්)
3. Subdomain එකක් හදාගන්න (example: `mygame.duckdns.org`)
4. ඔයාගේ VPS IP එක enter කරන්න
5. **Update IP** click කරන්න

දැන් ඔයාට `http://mygame.duckdns.org:5000` එකෙන් access කරන්න පුළුවන්!

### Port 5000 එක hide කරන්න (Optional - Advanced):

Nginx install කරන්න:
```bash
sudo apt install nginx -y

# Nginx config එකක් හදන්න
sudo nano /etc/nginx/sites-available/myapp

# මේක copy paste කරන්න:
server {
    listen 80;
    server_name your-domain.duckdns.org;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Save කරන්න: Ctrl+X, Y, Enter

# Enable කරන්න
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Firewall update කරන්න
sudo ufw allow 80
```

දැන් `http://mygame.duckdns.org` (port number නැතිව) වැඩ කරයි! 🎉

---

## ❓ Problems උනොත්:

### App එක start වෙන්නේ නෑ:
```bash
pm2 logs my-gaming-app  # Error එක check කරන්න
```

### Database connection error:
```bash
# Database URL එක හරිද check කරන්න
echo $DATABASE_URL

# Database running වෙනවාද check කරන්න
sudo systemctl status postgresql
```

### Port 5000 access වෙන්නේ නෑ:
```bash
# Firewall check කරන්න
sudo ufw status

# Port open කරන්න
sudo ufw allow 5000
```

---

## 📞 Help ඕනේ නම්:

VPS setup එකේ අමාරුවක් උනොත්, මේ details එක්ක කියන්න:
- VPS provider එක (Oracle/AWS/etc)
- Error message එක (screenshot එකක් හොඳයි)
- මොන step එකේද stuck වෙලා තියෙන්නේ

---

**Good Luck! 🚀 ඔයාගේ app එක successful වේවා!**
