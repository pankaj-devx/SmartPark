# Secure Code Generation System

## Overview

SmartPark implements a production-grade secure code generation system for creating unique, non-predictable codes for various entities. These codes serve as public-safe references instead of exposing database IDs.

## Code Format

### Standard Format
```
PREFIX-XXXXXXXX
```

### Examples
- `USER-A9F3K2D1` - User code
- `OWNER-91KLM2XQ` - Owner code  
- `ADMIN-X7P2Q9ZL` - Admin code
- `BOOK-4F92KD8A` - Booking code
- `PARK-7H3N9K2P` - Parking code

### Format Rules
1. **Prefix**: Represents the entity type (2-10 uppercase characters)
2. **Separator**: Single hyphen (`-`)
3. **Suffix**: 8 random characters (uppercase letters + numbers)
4. **Character Set**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
   - Excludes ambiguous characters: `O`, `0`, `I`, `1`, `l`

## Security Features

### 1. Cryptographically Secure Random Generation

Uses Node.js `crypto.randomBytes()` for strong randomness:

```javascript
import crypto from 'node:crypto';

const randomBytes = crypto.randomBytes(bytesNeeded);
// Convert to safe characters using modulo mapping
```

**Why not `Math.random()`?**
- `Math.random()` is predictable and not cryptographically secure
- `crypto.randomBytes()` uses OS-level entropy sources
- Suitable for security-sensitive applications

### 2. Uniqueness Guarantee

Before saving any code, the system:
1. Checks database for existing code
2. If collision detected, regenerates new code
3. Retries up to 5 times
4. Throws error if unable to generate unique code

```javascript
const code = await generateUniqueCode(
  'USER',
  async (code) => {
    const existing = await User.findOne({ userCode: code });
    return !existing; // Returns true if unique
  }
);
```

### 3. Database-Level Enforcement

All code fields have:
- **Unique index**: Prevents duplicates at DB level
- **Sparse index**: Allows null values for backward compatibility
- **Uppercase constraint**: Ensures consistency

```javascript
userCode: {
  type: String,
  unique: true,
  sparse: true,
  index: true,
  trim: true,
  uppercase: true
}
```

## Implementation

### Core Utility

**File**: `server/src/utils/codeGenerator.js`

#### Available Functions

```javascript
import {
  generateSecureCode,
  generateUniqueCode,
  validateCodeFormat,
  extractPrefix,
  maskCode,
  CODE_PREFIXES
} from './utils/codeGenerator.js';
```

#### 1. Generate Secure Code

```javascript
const code = generateSecureCode('USER');
// Returns: "USER-A9F3K2D1"
```

#### 2. Generate Unique Code (with DB check)

```javascript
const code = await generateUniqueCode(
  CODE_PREFIXES.BOOKING,
  async (code) => {
    const exists = await Booking.findOne({ bookingCode: code });
    return !exists;
  }
);
```

#### 3. Validate Code Format

```javascript
validateCodeFormat('USER-A9F3K2D1'); // true
validateCodeFormat('invalid'); // false
validateCodeFormat('USER-A9F3K2D1', 'USER'); // true (with prefix check)
```

#### 4. Extract Prefix

```javascript
extractPrefix('USER-A9F3K2D1'); // 'USER'
```

#### 5. Mask Code (for public display)

```javascript
maskCode('USER-A9F3K2D1'); // 'USER-****K2D1'
```

### Code Prefixes

```javascript
export const CODE_PREFIXES = {
  USER: 'USER',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  BOOKING: 'BOOK',
  PARKING: 'PARK',
  PAYMENT: 'PAY',
  REVIEW: 'REV'
};
```

## Integration

### 1. User Model

**File**: `server/src/models/user.model.js`

```javascript
const userSchema = new mongoose.Schema({
  userCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    trim: true,
    uppercase: true
  },
  // ... other fields
});
```

### 2. Booking Model

**File**: `server/src/models/booking.model.js`

```javascript
const bookingSchema = new mongoose.Schema({
  bookingCode: {
    type: String,
    unique: true,
    required: true,
    index: true,
    trim: true,
    uppercase: true
  },
  // ... other fields
});
```

### 3. Auth Service

**File**: `server/src/services/auth.service.js`

```javascript
import { generateUniqueCode, CODE_PREFIXES } from '../utils/codeGenerator.js';

export async function registerUser(input) {
  // Determine prefix based on role
  const codePrefix = input.role === 'owner' ? CODE_PREFIXES.OWNER : 
                     input.role === 'admin' ? CODE_PREFIXES.ADMIN : 
                     CODE_PREFIXES.USER;
  
  // Generate unique code
  const userCode = await generateUniqueCode(
    codePrefix,
    async (code) => {
      const existing = await User.findOne({ userCode: code });
      return !existing;
    }
  );
  
  const user = await User.create({
    userCode,
    name: input.name,
    email: input.email,
    // ... other fields
  });
  
  return { user, token };
}
```

### 4. Booking Service

**File**: `server/src/services/booking.service.js`

```javascript
export async function createBooking(input, user, deps = {}) {
  // ... validation logic
  
  // Generate unique booking code
  const bookingCode = await generateUniqueCode(
    CODE_PREFIXES.BOOKING,
    async (code) => {
      const existing = await BookingModel.findOne({ bookingCode: code }).session(session);
      return !existing;
    }
  );
  
  const [booking] = await BookingModel.create([{
    bookingCode,
    user: user._id,
    parking: parking._id,
    // ... other fields
  }], { session });
  
  return serializeBooking(booking);
}
```

### 5. API Responses

Always include codes in serialized responses:

```javascript
export function serializeBooking(booking) {
  return {
    id: booking._id.toString(),
    bookingCode: booking.bookingCode, // ✅ Include code
    user: booking.user?.toString(),
    parking: booking.parking?.toString(),
    // ... other fields
  };
}

export function getSafeUser(user) {
  return {
    id: user._id.toString(),
    userCode: user.userCode, // ✅ Include code
    name: user.name,
    email: user.email,
    // ... other fields
  };
}
```

## Usage Scenarios

### 1. Public-Safe References

**Instead of exposing database IDs:**
```json
{
  "bookingId": "507f1f77bcf86cd799439011"
}
```

**Use codes:**
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "bookingCode": "BOOK-4F92KD8A"
}
```

### 2. Booking Verification

Users can verify bookings using codes instead of IDs:

```javascript
// GET /bookings/verify?code=BOOK-4F92KD8A
const booking = await Booking.findOne({ bookingCode: req.query.code });
```

### 3. Admin Tracking

Admins can track entities using human-readable codes:

```javascript
// Search by code
const user = await User.findOne({ userCode: 'USER-A9F3K2D1' });
```

### 4. Customer Support

Support staff can reference bookings by code:
- "Please provide your booking code"
- "Your booking code is BOOK-4F92KD8A"

## Security Rules

### ✅ DO

1. **Generate codes server-side only**
   ```javascript
   // ✅ Server-side generation
   const code = await generateUniqueCode('USER', checkUniqueness);
   ```

2. **Use codes for public references**
   ```javascript
   // ✅ Safe to share publicly
   res.json({ bookingCode: 'BOOK-4F92KD8A' });
   ```

3. **Validate code format before lookup**
   ```javascript
   // ✅ Validate first
   if (!validateCodeFormat(code, 'BOOK')) {
     throw new Error('Invalid booking code');
   }
   ```

### ❌ DON'T

1. **Don't allow manual code input from users**
   ```javascript
   // ❌ Never allow users to set their own codes
   const user = await User.create({
     userCode: req.body.userCode // DANGEROUS!
   });
   ```

2. **Don't expose generation logic to frontend**
   ```javascript
   // ❌ Never generate codes on frontend
   // Frontend should only display codes, not generate them
   ```

3. **Don't use codes as authentication tokens**
   ```javascript
   // ❌ Codes are identifiers, not auth tokens
   // Use JWT or session tokens for authentication
   ```

## Advanced Features

### 1. Timestamp Encoding (Optional)

Encode creation timestamp for sortability:

```javascript
import { generateTimestampCode } from './utils/codeGenerator.js';

const code = generateTimestampCode('USER');
// Returns: "USER-3K9FA2D1" (first 4 chars encode timestamp)
```

### 2. Checksum Validation (Optional)

Add checksum for tamper detection:

```javascript
import { generateCodeWithChecksum, validateChecksum } from './utils/codeGenerator.js';

const code = generateCodeWithChecksum('USER');
// Returns: "USER-A9F3K2D7" (last char is checksum)

validateChecksum(code); // true
validateChecksum('USER-A9F3K2D8'); // false (tampered)
```

### 3. Code Masking

Mask codes for partial display:

```javascript
import { maskCode } from './utils/codeGenerator.js';

maskCode('USER-A9F3K2D1'); // 'USER-****K2D1'
```

## Error Handling

### Uniqueness Failure

If unable to generate unique code after 5 attempts:

```javascript
try {
  const code = await generateUniqueCode('USER', checkUniqueness);
} catch (error) {
  // Error: Failed to generate unique code with prefix USER after 5 attempts
  console.error('Code generation failed:', error);
  
  // Log for debugging
  logger.error('Code generation failure', {
    prefix: 'USER',
    attempts: 5,
    timestamp: new Date()
  });
  
  // Return 500 error to client
  throw createHttpError(500, 'Unable to generate unique identifier');
}
```

### Collision Monitoring

Monitor collision rates:

```javascript
// Collisions are logged automatically
// Code collision detected on attempt 1/5: USER-A9F3K2D1

// Set up monitoring alerts if collision rate exceeds threshold
```

## Testing

### Run Tests

```bash
cd server
npm test src/utils/codeGenerator.test.js
```

### Test Coverage

- ✅ Code format validation
- ✅ Uniqueness guarantee
- ✅ Retry mechanism
- ✅ Character set validation
- ✅ Prefix extraction
- ✅ Code masking
- ✅ Checksum validation
- ✅ Randomness distribution
- ✅ Security properties

### Example Test

```javascript
import { generateSecureCode, validateCodeFormat } from './codeGenerator.js';

// Generate code
const code = generateSecureCode('USER');

// Validate format
assert.match(code, /^USER-[A-Z2-9]{8}$/);
assert.strictEqual(validateCodeFormat(code), true);

// Check uniqueness
const code2 = generateSecureCode('USER');
assert.notStrictEqual(code, code2);
```

## Performance

### Collision Probability

With 8 characters from 32-character set:
- **Total combinations**: 32^8 = 1,099,511,627,776 (1.1 trillion)
- **Collision probability**: Negligible for millions of records
- **Expected collisions**: ~0 for typical application scale

### Generation Speed

- **Single code**: < 1ms
- **With DB check**: < 10ms (depends on DB latency)
- **Batch generation**: Linear scaling

## Migration Guide

### Adding Codes to Existing Records

```javascript
// Migration script
import { User } from './models/user.model.js';
import { generateUniqueCode, CODE_PREFIXES } from './utils/codeGenerator.js';

async function migrateUserCodes() {
  const users = await User.find({ userCode: { $exists: false } });
  
  for (const user of users) {
    const codePrefix = user.role === 'owner' ? CODE_PREFIXES.OWNER :
                       user.role === 'admin' ? CODE_PREFIXES.ADMIN :
                       CODE_PREFIXES.USER;
    
    const userCode = await generateUniqueCode(
      codePrefix,
      async (code) => {
        const existing = await User.findOne({ userCode: code });
        return !existing;
      }
    );
    
    user.userCode = userCode;
    await user.save();
    
    console.log(`Migrated user ${user._id}: ${userCode}`);
  }
  
  console.log(`Migrated ${users.length} users`);
}

migrateUserCodes().catch(console.error);
```

## Best Practices

1. **Always generate codes on entity creation**
2. **Include codes in all API responses**
3. **Use codes for public-facing references**
4. **Keep database IDs for internal operations**
5. **Monitor collision rates in production**
6. **Log code generation failures**
7. **Validate code format before database queries**
8. **Use appropriate prefix for each entity type**

## Troubleshooting

### Issue: Code generation fails

**Cause**: Database connection issue or high collision rate

**Solution**:
1. Check database connectivity
2. Verify unique index exists
3. Check collision logs
4. Increase retry attempts if needed

### Issue: Duplicate code error

**Cause**: Race condition or missing unique index

**Solution**:
1. Ensure unique index exists: `db.users.createIndex({ userCode: 1 }, { unique: true, sparse: true })`
2. Use transactions for code generation
3. Handle duplicate key errors gracefully

### Issue: Invalid code format

**Cause**: Manual code modification or old data

**Solution**:
1. Validate codes before use
2. Run migration script for old records
3. Add validation middleware

## Future Enhancements

1. **QR Code Generation**: Generate QR codes from booking codes
2. **Short URLs**: Create short URLs using codes
3. **Batch Generation**: Optimize for bulk code generation
4. **Custom Prefixes**: Allow dynamic prefix registration
5. **Code Analytics**: Track code usage patterns
6. **Expiration**: Add optional expiration timestamps
