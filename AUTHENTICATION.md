# Biometric Authentication - Vingerafdruk Login

Zyra v2 gebruikt **pure biometrische authenticatie** via WebAuthn. Geen wachtwoorden - alleen vingerafdruk, Face ID, of andere biometrische authenticatie.

## ✨ Features

- 🔐 **Geen wachtwoorden** - Pure biometrische authenticatie
- 👆 **Vingerafdruk login** - Touch ID, Windows Hello, fingerprint sensors
- 👤 **Gezichtsherkenning** - Face ID op iPhone/iPad/Mac
- 🔑 **Security keys** - YubiKey en andere FIDO2 keys
- 👥 **Multi-user support** - Meerdere gebruikers met eigen biometrische credentials
- 🔒 **Veilige sessies** - 30 dagen sessie duur met automatische verlenging
- 📱 **Cross-device** - Werkt op desktop, laptop, tablet en mobiel

## 🚀 Eerste Keer Setup

### Stap 1: Database Migratie

Na deployment, run de Prisma migratie:

```bash
cd /opt/insurance-orchestrator
sudo -u orchestrator npx prisma generate
sudo -u orchestrator npx prisma db push
```

### Stap 2: Eerste Admin Account

1. Open je browser en ga naar: `http://jouw-vps-ip`
2. Je wordt automatisch doorgestuurd naar `/login`
3. Klik op **"Registreren"**
4. Vul je naam en email in
5. Klik op **"Registreer met vingerafdruk"**
6. Je browser vraagt om je vingerafdruk/Face ID
7. Scan je vingerafdruk
8. Je bent nu ingelogd als **admin**!

## 👥 Nieuwe Gebruikers Toevoegen

Extra gebruikers kunnen zichzelf registreren:

1. Ga naar `/login`
2. Klik op **"Registreren"**
3. Vul naam en email in
4. Registreer vingerafdruk
5. De gebruiker krijgt automatisch **"user"** rol

**Admin vs User rollen:**
- **Admin**: Volledige toegang
- **User**: Standaard toegang (kan later uitgebreid worden met permissions)

## 🔐 Inloggen

1. Ga naar `/login`
2. Zorg dat je op **"Inloggen"** tab bent
3. Klik op **"Inloggen met vingerafdruk"**
4. Scan je vingerafdruk
5. Done! Je bent ingelogd

**Tip:** Je hoeft geen email in te vullen bij login - de vingerafdruk wordt automatisch herkend.

## 🛡️ Hoe Werkt Het?

### WebAuthn Protocol

Zyra gebruikt het **WebAuthn** protocol (Web Authentication API):

1. **Registratie:**
   - Browser genereert een public/private key pair
   - Private key blijft in je device (Secure Enclave op iOS/Mac, TPM op Windows)
   - Public key wordt opgeslagen in de database
   - Biometrische authenticatie (vingerafdruk) is vereist om private key te gebruiken

2. **Login:**
   - Server stuurt een challenge
   - Je device tekent de challenge met de private key (vereist vingerafdruk)
   - Server verifieert de signature met de opgeslagen public key
   - Als valid: sessie wordt aangemaakt

3. **Sessie:**
   - Session token wordt opgeslagen in een httpOnly cookie
   - Token is 30 dagen geldig
   - Server verifieert token bij elke request

### Waarom Zo Veilig?

- ✅ **Geen wachtwoorden** - Kan niet gelekt, gehackt of geraden worden
- ✅ **Private key verlaat device nooit** - Opgeslagen in hardware (Secure Enclave/TPM)
- ✅ **Phishing-proof** - Domain binding voorkomt phishing attacks
- ✅ **Replay-proof** - Counter mechanism voorkomt replay attacks
- ✅ **Man-in-the-middle proof** - Challenge-response met signatures

## 📱 Ondersteunde Devices

### ✅ Desktop/Laptop
- **macOS**: Touch ID op MacBook Pro/Air
- **Windows**: Windows Hello (fingerprint of gezichtsherkenning)
- **Linux**: FIDO2 compatible fingerprint readers

### ✅ Mobiel
- **iOS**: Touch ID of Face ID
- **Android**: Fingerprint sensor

### ✅ External Keys
- **YubiKey** - FIDO2 security keys
- **Google Titan** - Hardware security keys
- **Andere FIDO2 keys**

## 🔧 Database Schema

### User Model
```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  role      String   @default("user") // admin, user
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  credentials WebAuthnCredential[]
  sessions    Session[]
}
```

### WebAuthnCredential Model
```prisma
model WebAuthnCredential {
  id           String   @id @default(uuid())
  userId       String
  credentialId String   @unique
  publicKey    String   @db.Text
  counter      Int      @default(0)
  transports   Json?
  deviceName   String?
  createdAt    DateTime @default(now())
  lastUsedAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

### Session Model
```prisma
model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  userAgent String?
  ipAddress String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register/options` - Get registration options
- `POST /api/auth/register/verify` - Verify registration
- `POST /api/auth/login/options` - Get login options
- `POST /api/auth/login/verify` - Verify login
- `GET /api/auth/session` - Check current session
- `POST /api/auth/logout` - Logout

## 🔒 Security Features

### Route Protection
Alle routes behalve `/login` en `/api/auth/*` zijn beveiligd via middleware:

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

### Session Management
- **30 dagen geldigheid** - Lange sessie voor convenience
- **HttpOnly cookies** - Voorkomt XSS attacks
- **Secure flag in production** - Alleen via HTTPS
- **SameSite=Lax** - CSRF protectie

### Password Hashing (Fallback)
Hoewel we geen passwords gebruiken, is er een fallback mechanisme voor emergencies:

```typescript
// Scrypt password hashing met salt
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
```

## 🚨 Troubleshooting

### Browser ondersteunt geen WebAuthn
**Oplossing:** Gebruik een moderne browser (Chrome, Firefox, Safari, Edge)

### Vingerafdruk werkt niet
**Mogelijke oorzaken:**
1. Browser heeft geen toegang tot biometric authenticator
2. Device heeft geen fingerprint sensor/Touch ID
3. HTTPS is vereist in production

**Oplossing:**
- Check browser permissions
- Gebruik een ander device met fingerprint
- Zorg dat HTTPS is ingeschakeld (Let's Encrypt)

### "Credential not found" error bij login
**Oorzaak:** Vingerafdruk is geregistreerd op een ander device

**Oplossing:** Login op het device waar je geregistreerd hebt, of registreer een nieuwe credential

### Session expired
**Oplossing:** Login opnieuw met vingerafdruk

### Multiple credentials per user
Een gebruiker kan meerdere credentials hebben (bijv. MacBook + iPhone):

```typescript
// Registreer extra credential
// 1. Login op nieuw device
// 2. Ga naar instellingen
// 3. Voeg nieuwe vingerafdruk toe
```

## 🔐 Best Practices

1. **Gebruik HTTPS in production** - WebAuthn vereist HTTPS (behalve localhost)
2. **Backup admin account** - Zorg dat minimaal 2 mensen admin toegang hebben
3. **Meerdere credentials** - Registreer je vingerafdruk op meerdere devices
4. **Monitor sessions** - Check regelmatig actieve sessies in de database
5. **Revoke credentials** - Verwijder credentials van verloren/gestolen devices

## 📊 Monitoring

### Check actieve sessies
```sql
SELECT
  s.id,
  u.name,
  u.email,
  s.expiresAt,
  s.userAgent,
  s.ipAddress,
  s.createdAt
FROM Session s
JOIN User u ON s.userId = u.id
WHERE s.expiresAt > NOW()
ORDER BY s.createdAt DESC;
```

### Check gebruikers en credentials
```sql
SELECT
  u.name,
  u.email,
  u.role,
  COUNT(c.id) as credential_count,
  MAX(c.lastUsedAt) as last_login
FROM User u
LEFT JOIN WebAuthnCredential c ON u.id = c.userId
WHERE u.isActive = true
GROUP BY u.id;
```

### Revoke alle sessies van een gebruiker
```sql
DELETE FROM Session WHERE userId = 'user-uuid';
```

### Deactiveer een gebruiker
```sql
UPDATE User SET isActive = false WHERE email = 'user@example.com';
```

## 🔄 Updates & Migrations

Als je de authenticatie code update:

```bash
# 1. Pull nieuwe code
git pull origin main

# 2. Regenereer Prisma client
npx prisma generate

# 3. Run migrations (als schema changed)
npx prisma db push

# 4. Restart applicatie
pm2 restart insurance-orchestrator
```

## 📚 References

- [WebAuthn Guide](https://webauthn.guide/)
- [MDN Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [FIDO Alliance](https://fidoalliance.org/)
- [W3C WebAuthn Spec](https://www.w3.org/TR/webauthn/)

## 💡 Toekomstige Features

- [ ] **Passkeys** - Apple/Google passkey sync
- [ ] **Recovery codes** - Backup codes voor emergency
- [ ] **2FA fallback** - Optional TOTP als backup
- [ ] **Device management** - Overzicht van alle geregistreerde devices
- [ ] **Security logs** - Audit trail van login attempts
- [ ] **Rol-based permissions** - Granulaire toegangscontrole per feature
- [ ] **Project-level permissions** - Users kunnen alleen hun eigen projecten zien

---

**Veilig en gemakkelijk! Geen wachtwoorden meer! 🎉**
