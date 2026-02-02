# NPM Installation Troubleshooting

This guide helps resolve common npm installation issues on Windows, especially with Prisma.

## Common Issue: Prisma Engines Download Failure

### Symptoms
- `Error: ECONNRESET` during npm install
- `Error: aborted` when downloading Prisma engines
- File permission errors (`EPERM`) on Windows

### Solution Steps

#### Step 1: Clean Everything

```powershell
# Navigate to backend directory
cd backend

# Clear npm cache
npm cache clean --force

# Remove node_modules (if exists)
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Remove package-lock.json (if exists)
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
```

#### Step 2: Set Prisma Environment Variables

The download failure is usually due to network issues or antivirus blocking. Set these environment variables:

```powershell
# In PowerShell, set before installation:
$env:PRISMA_ENGINES_MIRROR="https://binaries.prismacdn.com"
$env:PRISMA_CLI_BINARY_TARGETS="native,windows"
```

Or create a `.npmrc` file in the backend directory:

```
# backend/.npmrc
maxsockets=1
network-timeout=600000
```

#### Step 3: Install with Retry

Option A - **Standard install with longer timeout**:
```powershell
npm install --loglevel verbose --fetch-timeout=600000
```

Option B - **Install without Prisma engines first**, then install them separately:
```powershell
# Install without postinstall scripts
npm install --ignore-scripts

# Then generate Prisma client manually
npx prisma generate
```

Option C - **Use offline mirror** (if on restricted network):
```powershell
$env:PRISMA_BINARIES_MIRROR="https://prisma-binaries.s3-eu-west-1.amazonaws.com"
npm install
```

#### Step 4: If Still Failing - Manual Prisma Setup

If Prisma download keeps failing:

1. **Use Prisma's alternative CDN**:
   ```powershell
   $env:PRISMA_ENGINES_MIRROR="https://binaries.prismacdn.com"
   npm install
   ```

2. **Or skip Prisma initially** and install later:
   ```powershell
   # Temporarily remove Prisma from package.json
   # Install everything else
   npm install
   
   # Then add Prisma back and install separately
   npm install @prisma/client prisma --save-dev
   npx prisma generate
   ```

## Windows-Specific Permission Issues

### Problem: EPERM errors when removing directories

**Solution 1 - Close VS Code/IDEs**:
- Close Visual Studio Code or any IDE that might be locking files
- Close all terminals
- Retry installation

**Solution 2 - Run as Administrator**:
```powershell
# Open PowerShell as Administrator
# Navigate to project
cd C:\Users\HP\Documents\telegram\backend
npm install
```

**Solution 3 - Use npm config to avoid cleanup errors**:
```powershell
npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm install
```

## Deprecated Package Warnings

You can safely **ignore** these warnings for now:
- `inflight`, `glob` - Used by dependencies, not directly by you
- `request`, `superagent`, `supertest` - Testing libraries, will be updated later
- `har-validator` - Dependency of request
- `uuid@3.4.0` - Will be updated automatically in future

These don't affect functionality, just maintenance status.

## Quick Fix Commands (Copy & Paste)

### For Network/Download Issues:
```powershell
cd C:\Users\HP\Documents\telegram\backend

# Clean everything
npm cache clean --force
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Set Prisma mirror and retry
$env:PRISMA_ENGINES_MIRROR="https://binaries.prismacdn.com"
npm install --fetch-timeout=600000
```

### For Permission Issues:
```powershell
# Close all VS Code windows, then:
cd C:\Users\HP\Documents\telegram\backend

# Clean
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Retry with retries configured
npm config set fetch-retries 5
npm install
```

### Last Resort - Skip Scripts:
```powershell
cd C:\Users\HP\Documents\telegram\backend

# Install without running postinstall scripts
npm install --ignore-scripts

# Then manually run Prisma generation
npx prisma generate
```

## After Successful Installation

Once npm install completes:

1. **Verify Prisma is working**:
   ```powershell
   npx prisma --version
   ```

2. **Generate Prisma Client** (if not already done):
   ```powershell
   npx prisma generate
   ```

3. **Check if all is well**:
   ```powershell
   npm run type-check
   ```

## Alternative: Use Yarn Instead

If npm continues to fail, try Yarn:

```powershell
# Install Yarn globally
npm install -g yarn

# Use Yarn instead
cd backend
yarn install
```

Yarn often handles downloads and permissions better on Windows.

## Still Having Issues?

If none of the above work:

1. **Check your firewall/antivirus** - they might be blocking Prisma CDN
2. **Try a different network** - corporate networks often block CDN downloads
3. **Use a VPN** - if your ISP/network is blocking downloads
4. **Manual download** - Contact me and we'll manually download the Prisma binaries

---

**Most Common Fix**: Clean everything + set Prisma mirror + longer timeout

```powershell
cd C:\Users\HP\Documents\telegram\backend
npm cache clean --force
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
$env:PRISMA_ENGINES_MIRROR="https://binaries.prismacdn.com"
npm install --fetch-timeout=600000
```
