# Phone Number Validation for Indian Users

## Overview

SmartPark implements comprehensive phone number validation specifically designed for Indian mobile numbers. The system handles multiple input formats, normalizes data, and ensures consistent storage.

## Supported Formats

### Input Formats (Frontend)

Users can enter phone numbers in any of these formats:

1. **10-digit number**: `9876543210`
2. **With +91 prefix**: `+919876543210`
3. **With +91 and space**: `+91 9876543210`
4. **With spaces**: `98765 43210`
5. **With hyphens**: `987-654-3210`
6. **With parentheses**: `(987) 654-3210`
7. **Mixed formatting**: `+91 (98765) 43210`

### Storage Format (Backend)

All phone numbers are stored in a standardized format:
- **10 digits only**: `9876543210`
- **No country code**: Country code is removed
- **No formatting**: Spaces, hyphens, and parentheses are removed

### Display Format (Frontend)

Phone numbers are displayed in a user-friendly format:
- **Format**: `+91 XXXXX XXXXX`
- **Example**: `+91 98765 43210`

## Validation Rules

### Indian Mobile Number Requirements

1. **Length**: Exactly 10 digits
2. **First digit**: Must be 6, 7, 8, or 9
3. **Remaining digits**: Any digit (0-9)
4. **Regex**: `/^[6-9]\d{9}$/`

### Valid Examples
- ✅ `9876543210` (starts with 9)
- ✅ `8765432109` (starts with 8)
- ✅ `7654321098` (starts with 7)
- ✅ `6543210987` (starts with 6)

### Invalid Examples
- ❌ `5876543210` (starts with 5)
- ❌ `1234567890` (starts with 1)
- ❌ `987654321` (only 9 digits)
- ❌ `98765432109` (11 digits)

## Frontend Implementation

### File: `client/src/features/auth/authValidation.js`

#### 1. Validate Phone Number

```javascript
export function validatePhone(phone) {
  if (!phone?.trim()) return ''; // optional field
  
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return 'Enter a valid Indian mobile number';
  }
  
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return 'Enter a valid Indian mobile number';
  }
  
  return '';
}
```

#### 2. Normalize Phone Number

```javascript
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remove spaces, hyphens, parentheses
  let cleaned = phone.trim().replace(/[\s\-()]/g, '');
  
  // Remove +91 country code
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  
  // Must be exactly 10 digits
  if (cleaned.length !== 10) {
    return null;
  }
  
  return cleaned;
}
```

#### 3. Format Phone Number for Display

```javascript
export function formatPhoneNumber(phone) {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized || normalized.length !== 10) {
    return phone; // Return original if can't normalize
  }
  
  // Format as +91 XXXXX XXXXX
  return `+91 ${normalized.substring(0, 5)} ${normalized.substring(5)}`;
}
```

### Usage in RegisterPage

```javascript
import { validatePhone, normalizePhoneNumber } from './authValidation.js';

function updateField(event) {
  const { name, value } = event.target;
  
  if (name === 'phone') {
    const phoneError = validatePhone(value);
    setFieldErrors((current) => ({ ...current, phone: phoneError }));
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  
  const phoneError = validatePhone(form.phone);
  if (phoneError) {
    setError(phoneError);
    return;
  }
  
  // Normalize before sending to API
  const normalizedPhone = normalizePhoneNumber(form.phone);
  
  await apiClient.post('/auth/register', {
    ...form,
    phone: normalizedPhone || ''
  });
}
```

### Phone Display Component

**File**: `client/src/features/profile/PhoneDisplay.jsx`

```javascript
import { formatPhoneNumber } from '../auth/authValidation.js';

export function PhoneDisplay({ phone, className = '' }) {
  if (!phone) {
    return <span className={className}>—</span>;
  }
  
  const formatted = formatPhoneNumber(phone);
  
  return <span className={className}>{formatted}</span>;
}
```

**Usage**:
```jsx
<PhoneDisplay phone={user.phone} />
// Displays: +91 98765 43210
```

## Backend Implementation

### File: `server/src/utils/phoneValidation.js`

#### 1. Validate Phone Number

```javascript
export function validatePhoneNumber(phone) {
  // Empty phone is valid (optional field)
  if (!phone || phone.trim() === '') {
    return { valid: true, error: null, normalized: '' };
  }
  
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return {
      valid: false,
      error: 'Enter a valid Indian mobile number',
      normalized: null
    };
  }
  
  // Validate format: must start with 6-9 and be exactly 10 digits
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return {
      valid: false,
      error: 'Enter a valid Indian mobile number',
      normalized: null
    };
  }
  
  return {
    valid: true,
    error: null,
    normalized
  };
}
```

#### 2. Normalize Phone Number

```javascript
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remove spaces, hyphens, parentheses
  let cleaned = phone.trim().replace(/[\s\-()]/g, '');
  
  // Remove +91 country code
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Handle old format with leading 0
    cleaned = cleaned.substring(1);
  }
  
  // Remove non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  
  // Must be exactly 10 digits
  if (cleaned.length !== 10) {
    return null;
  }
  
  return cleaned;
}
```

#### 3. Format Phone Number

```javascript
export function formatPhoneNumber(phone) {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized || normalized.length !== 10) {
    return phone;
  }
  
  // Format as +91 XXXXX XXXXX
  return `+91 ${normalized.substring(0, 5)} ${normalized.substring(5)}`;
}
```

### Integration with Zod Validator

**File**: `server/src/validators/auth.validator.js`

```javascript
import { validatePhoneNumber } from '../utils/phoneValidation.js';

const phoneValidator = z.string().trim().refine(
  (phone) => {
    const result = validatePhoneNumber(phone);
    return result.valid;
  },
  {
    message: 'Enter a valid Indian mobile number'
  }
).transform((phone) => {
  // Normalize phone number before saving
  const result = validatePhoneNumber(phone);
  return result.normalized || '';
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailValidator,
  password: passwordSchema,
  role: z.enum(['driver', 'owner']).default('driver'),
  phone: phoneValidator.optional()
});
```

### Integration with Auth Service

**File**: `server/src/services/auth.service.js`

```javascript
import { normalizePhoneNumber } from '../utils/phoneValidation.js';

export async function registerUser(input) {
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 12),
    role: input.role,
    phone: normalizePhoneNumber(input.phone) ?? ''
  });
  
  return { user, token };
}

export async function updateCurrentUser(user, input) {
  user.name = input.name;
  user.email = input.email;
  user.phone = normalizePhoneNumber(input.phone) ?? '';
  
  await user.save();
  return user;
}
```

## Validation Flow

### Registration Flow

```
User Input: "+91 98765 43210"
    ↓
Frontend Validation: validatePhone()
    ↓
Frontend Normalization: normalizePhoneNumber()
    ↓
Result: "9876543210"
    ↓
API Request: { phone: "9876543210" }
    ↓
Backend Validation: Zod phoneValidator
    ↓
Backend Normalization: transform()
    ↓
Database Storage: "9876543210"
```

### Display Flow

```
Database: "9876543210"
    ↓
API Response: { phone: "9876543210" }
    ↓
Frontend Display: formatPhoneNumber()
    ↓
User Sees: "+91 98765 43210"
```

## Error Messages

### Frontend
- **Empty field**: No error (optional)
- **Invalid format**: "Enter a valid Indian mobile number"
- **Wrong length**: "Enter a valid Indian mobile number"
- **Invalid first digit**: "Enter a valid Indian mobile number"

### Backend
- **Empty field**: Accepted (optional)
- **Invalid format**: "Enter a valid Indian mobile number"
- **Validation failure**: 400 Bad Request

## Testing

### Run Backend Tests

```bash
cd server
npm test src/utils/phoneValidation.test.js
```

### Test Coverage

**27 tests passing**:
- ✅ Normalize 10-digit numbers
- ✅ Remove +91 prefix
- ✅ Remove spaces and hyphens
- ✅ Handle parentheses
- ✅ Validate correct numbers
- ✅ Reject invalid first digits
- ✅ Reject wrong lengths
- ✅ Format for display
- ✅ Handle edge cases

### Example Tests

```javascript
import { validatePhoneNumber, formatPhoneNumber } from './phoneValidation.js';

// Valid numbers
assert.strictEqual(validatePhoneNumber('9876543210').valid, true);
assert.strictEqual(validatePhoneNumber('+919876543210').valid, true);
assert.strictEqual(validatePhoneNumber('98765 43210').valid, true);

// Invalid numbers
assert.strictEqual(validatePhoneNumber('5876543210').valid, false);
assert.strictEqual(validatePhoneNumber('123').valid, false);

// Formatting
assert.strictEqual(formatPhoneNumber('9876543210'), '+91 98765 43210');
```

## API Examples

### Registration Request

```json
POST /auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "driver",
  "phone": "+91 98765 43210"
}
```

### Registration Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "role": "driver"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Profile Update Request

```json
PATCH /profile
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "98765 43210"
}
```

## Best Practices

### Frontend

1. **Real-time validation**: Validate as user types
2. **Normalize before submit**: Always normalize before API call
3. **Format for display**: Use formatPhoneNumber() for display
4. **Clear error messages**: Show specific error messages
5. **Placeholder text**: Use "+91 98765 43210" as placeholder

### Backend

1. **Normalize on save**: Always normalize before database storage
2. **Validate format**: Use regex validation
3. **Store 10 digits only**: Never store country code
4. **Optional field**: Allow empty phone numbers
5. **Consistent format**: Ensure all stored numbers are normalized

## Edge Cases Handled

1. **Multiple formats**: Accepts various input formats
2. **Country code variations**: Handles +91, 91, and no prefix
3. **Old format**: Handles leading zero (09876543210)
4. **Extra spaces**: Removes all whitespace
5. **Mixed formatting**: Handles combinations of spaces, hyphens, parentheses
6. **Empty input**: Treats as valid (optional field)
7. **International numbers**: Rejects non-Indian numbers

## Migration Guide

### Updating Existing Phone Numbers

```javascript
// Migration script
import { User } from './models/user.model.js';
import { normalizePhoneNumber } from './utils/phoneValidation.js';

async function migratePhoneNumbers() {
  const users = await User.find({ phone: { $exists: true, $ne: '' } });
  
  for (const user of users) {
    const normalized = normalizePhoneNumber(user.phone);
    
    if (normalized && normalized !== user.phone) {
      user.phone = normalized;
      await user.save();
      console.log(`Migrated user ${user._id}: ${user.phone} → ${normalized}`);
    }
  }
  
  console.log(`Migrated ${users.length} users`);
}

migratePhoneNumbers().catch(console.error);
```

## Troubleshooting

### Issue: Phone validation fails for valid number

**Cause**: Number doesn't start with 6-9

**Solution**: Indian mobile numbers must start with 6, 7, 8, or 9

### Issue: +91 prefix not removed

**Cause**: Normalization not applied

**Solution**: Ensure normalizePhoneNumber() is called before storage

### Issue: Display shows 10 digits instead of formatted

**Cause**: formatPhoneNumber() not used

**Solution**: Use PhoneDisplay component or formatPhoneNumber() function

## Future Enhancements

1. **OTP Verification**: Send SMS OTP for phone verification
2. **WhatsApp Integration**: Link WhatsApp to phone number
3. **Multiple Numbers**: Support multiple phone numbers per user
4. **International Support**: Add support for other countries
5. **Phone Type**: Distinguish between mobile and landline
6. **Carrier Detection**: Detect mobile carrier from number
