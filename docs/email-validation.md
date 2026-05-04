# Email Validation System

## Overview

SmartPark implements a comprehensive email validation system across both frontend and backend to ensure data quality and security.

## Backend Validation

### Location
- **File**: `server/src/utils/emailValidation.js`
- **Validator**: `server/src/validators/auth.validator.js`

### Features

#### 1. Regex Validation
```javascript
const EMAIL_REGEX = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
```

**Validates:**
- ✅ Proper username (alphanumeric, dots, hyphens, underscores, plus signs)
- ✅ @ symbol (required)
- ✅ Valid domain (alphanumeric with hyphens, supports subdomains)
- ✅ Valid TLD (.com, .in, .org, etc. - 2-6 characters)

#### 2. Comprehensive Format Checks

**Username Validation:**
- Cannot start or end with a dot
- Cannot have consecutive dots (..)
- Length: 1-64 characters

**Domain Validation:**
- Must have at least one dot
- Cannot start/end with dot or hyphen
- Length: 3-255 characters

**TLD Validation:**
- Must be 2-6 alphabetic characters
- Only letters allowed (no numbers)

#### 3. Error Messages
All invalid emails return:
```
"Please enter a valid email address"
```

### API Integration

The validation is integrated into Zod schemas:

```javascript
// server/src/validators/auth.validator.js
const emailValidator = z.string().trim().toLowerCase().refine(
  (email) => {
    const result = validateEmailFormat(email);
    return result.valid;
  },
  {
    message: 'Please enter a valid email address'
  }
);
```

**Used in:**
- Registration (`/auth/register`)
- Login (`/auth/login`)
- Profile updates (`/profile`)

## Frontend Validation

### Location
- **File**: `client/src/features/auth/authValidation.js`
- **Components**: `LoginPage.jsx`, `RegisterPage.jsx`, `FormField.jsx`

### Features

#### 1. Real-time Validation
Email validation occurs as the user types:

```javascript
function updateField(event) {
  const { name, value } = event.target;
  
  if (name === 'email') {
    const emailError = validateEmail(value);
    setFieldErrors((current) => ({ ...current, email: emailError }));
  }
}
```

#### 2. Instant Error Display
Errors appear immediately below the input field:

```jsx
<FormField 
  label="Email" 
  name="email" 
  type="email" 
  value={form.email}
  error={fieldErrors.email}  // Shows: "Invalid email format"
/>
```

#### 3. Visual Feedback
- ❌ Red border on invalid input
- ⚠️ Error icon with message
- ✅ Normal border when valid

#### 4. Submit Prevention
Form submission is blocked if email is invalid:

```javascript
async function handleSubmit(event) {
  event.preventDefault();
  
  const emailError = validateEmail(form.email);
  if (emailError) { 
    setFieldErrors((current) => ({ ...current, email: emailError }));
    setError(emailError); 
    return;  // Prevents submission
  }
  
  // Proceed with API call...
}
```

## Test Cases

### Valid Emails ✅
- `user@example.com`
- `john.doe@company.co.in`
- `test+tag@gmail.com`
- `user_name@domain.org`
- `first.last@sub.domain.com`

### Invalid Emails ❌
- `notanemail` - Missing @ and domain
- `@example.com` - Missing username
- `user@` - Missing domain
- `user @example.com` - Contains space
- `user@example` - Missing TLD
- `.user@example.com` - Username starts with dot
- `user.@example.com` - Username ends with dot
- `user..name@example.com` - Consecutive dots
- `user@example.c` - TLD too short
- `user@example.toolongtld` - TLD too long

## Optional: Common Domain Restriction

### Backend
```javascript
import { validateEmail } from './utils/emailValidation.js';

// Require common domains (Gmail, Yahoo, Outlook, etc.)
const result = validateEmail(email, { requireCommonDomain: true });

if (!result.valid) {
  throw new Error(result.error);
}
```

### Frontend
```javascript
import { validateEmail } from './authValidation.js';

// Require common domains
const emailError = validateEmail(form.email, { requireCommonDomain: true });
```

### Supported Common Domains
- gmail.com
- yahoo.com / yahoo.co.in
- outlook.com
- hotmail.com
- icloud.com
- protonmail.com
- zoho.com
- aol.com
- mail.com
- yandex.com
- rediffmail.com

## Advanced Features (Optional)

### Email Verification Service Integration

For production environments, consider integrating:

1. **Email Verification APIs**
   - [Abstract API Email Validation](https://www.abstractapi.com/email-verification-validation-api)
   - [Hunter.io Email Verifier](https://hunter.io/email-verifier)
   - [ZeroBounce](https://www.zerobounce.net/)

2. **OTP Verification**
   - Send verification code to email
   - User must verify before account activation
   - Implementation in `server/src/services/email.service.js`

### Example: OTP Verification Flow

```javascript
// 1. Generate OTP
const otp = Math.floor(100000 + Math.random() * 900000);

// 2. Store in database with expiry
await OTP.create({
  email: user.email,
  code: otp,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
});

// 3. Send email
await sendEmail({
  to: user.email,
  subject: 'Verify your email',
  text: `Your verification code is: ${otp}`
});

// 4. Verify OTP
const otpRecord = await OTP.findOne({ email, code: userProvidedOTP });
if (!otpRecord || otpRecord.expiresAt < new Date()) {
  throw new Error('Invalid or expired OTP');
}
```

## Testing

Run backend tests:
```bash
cd server
npm test src/utils/emailValidation.test.js
```

## Security Considerations

1. **Case Insensitivity**: All emails are converted to lowercase
2. **Trimming**: Leading/trailing whitespace is removed
3. **SQL Injection**: Parameterized queries prevent injection
4. **XSS Prevention**: Email is sanitized before display
5. **Rate Limiting**: Prevent brute force attacks on login/register

## Error Handling

### Backend Response
```json
{
  "success": false,
  "message": "Please enter a valid email address"
}
```

### Frontend Display
- Inline error below input field
- Global error at top of form
- Visual feedback (red border)

## Configuration

To enable common domain restriction:

**Backend** (`server/src/validators/auth.validator.js`):
```javascript
const emailValidator = z.string().trim().toLowerCase().refine(
  (email) => {
    const result = validateEmail(email, { requireCommonDomain: true });
    return result.valid;
  },
  {
    message: result.error || 'Please enter a valid email address'
  }
);
```

**Frontend** (`client/src/features/auth/authValidation.js`):
```javascript
export function validateEmail(email, options = { requireCommonDomain: false }) {
  // ... validation logic
}
```

## Maintenance

- Update `COMMON_DOMAINS` list as needed
- Monitor validation errors in logs
- Adjust regex if new TLDs are introduced
- Keep validation logic synchronized between frontend and backend
