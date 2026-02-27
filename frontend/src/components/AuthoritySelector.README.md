# AuthoritySelector Component

A React component for selecting authorities who will receive encrypted complaints in the Aawaaj anonymous harassment reporting platform.

## Features

✅ **Multi-select Authority Grid** - Select multiple authorities from 4 types (HR, ICC, NGO, Legal)
✅ **Visual Feedback** - Clear selected state with animations and checkboxes
✅ **HR Bypass Warning** - Prominent warning allowing users to bypass HR if needed
✅ **Responsive Design** - 2-column grid on desktop, 1-column on mobile
✅ **Accessibility** - Keyboard navigation support with Enter/Space keys
✅ **Selection Count** - Real-time display of selected authority count
✅ **Encryption Info** - Educational content about how encryption works
✅ **Validation** - Prevents proceeding without selecting at least one authority

## Installation

The component is located at:
```
frontend/src/components/AuthoritySelector.jsx
frontend/src/components/AuthoritySelector.css
```

## Usage

### Basic Usage

```jsx
import React, { useState } from 'react';
import AuthoritySelector from './components/AuthoritySelector';

function MyForm() {
  const [selectedAuthorities, setSelectedAuthorities] = useState([]);

  return (
    <AuthoritySelector
      selectedAuthorities={selectedAuthorities}
      onSelect={setSelectedAuthorities}
      onNext={() => console.log('Next clicked')}
      onBack={() => console.log('Back clicked')}
    />
  );
}
```

### Integration with Multi-Step Form

```jsx
import React, { useState } from 'react';
import AuthoritySelector from './components/AuthoritySelector';

function ComplaintForm() {
  const [step, setStep] = useState(1);
  const [selectedAuthorities, setSelectedAuthorities] = useState([]);

  const handleAuthoritySelect = (newSelection) => {
    setSelectedAuthorities(newSelection);
  };

  const handleNext = () => {
    if (selectedAuthorities.length > 0) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <div>
      {step === 2 && (
        <AuthoritySelector
          selectedAuthorities={selectedAuthorities}
          onSelect={handleAuthoritySelect}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
```

### Getting Selected Authority Objects

```jsx
// The component stores authority IDs in selectedAuthorities array
// Example: ["auth-hr-001", "auth-icc-001"]

// To get full authority objects with public keys:
const authorities = [
  // ... authority data from component
];

const selectedAuthorityObjects = authorities.filter(
  auth => selectedAuthorities.includes(auth.id)
);

// Use these objects for encryption
selectedAuthorityObjects.forEach(auth => {
  console.log(auth.name, auth.publicKey);
});
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `selectedAuthorities` | `Array<string>` | Yes | `[]` | Array of selected authority IDs |
| `onSelect` | `Function` | Yes | - | Callback when selection changes. Receives new selection array |
| `onNext` | `Function` | No | - | Callback for next button. If provided, Next button will be shown |
| `onBack` | `Function` | No | - | Callback for back button. If provided, Back button will be shown |

## Authority Data Structure

Each authority object has the following structure:

```javascript
{
  id: "auth-hr-001",           // Unique identifier
  name: "Company HR Department", // Display name
  type: "HR",                   // HR | ICC | NGO | Legal
  icon: "🏢",                   // Emoji icon
  description: "Internal HR team...", // Short description
  publicKey: "-----BEGIN PUBLIC KEY-----...", // RSA public key
  warning: true,                // Optional: show warning (for HR)
  recommended: true             // Optional: show recommended badge
}
```

## Built-in Authorities

The component includes 4 pre-configured authorities:

1. **Company HR Department** (HR) - with warning badge
2. **Internal Complaints Committee** (ICC) - recommended
3. **Women's Safety NGO Partner** (NGO) - recommended  
4. **Legal Compliance Office** (Legal)

## Styling

### Color Scheme

- Primary Blue: `#2563eb`
- Selected State: Light blue gradient
- HR Warning: Yellow/amber tones
- Info Boxes: Purple gradient

### Customization

To customize styles, edit `AuthoritySelector.css`. Key classes:

- `.authority-card` - Individual authority cards
- `.authority-card.selected` - Selected state
- `.type-badge` - Badge styles (has variants for each type)
- `.hr-warning-banner` - Top warning banner

### Responsive Breakpoints

- **Desktop**: 2-column grid (> 768px)
- **Tablet**: 1-column grid (≤ 768px)
- **Mobile**: Stacked layout with adjusted spacing (≤ 480px)

## Accessibility

- ✅ Keyboard navigation with Tab key
- ✅ Enter/Space to toggle selection
- ✅ Focus indicators for keyboard users
- ✅ Semantic HTML with proper roles
- ✅ Sufficient color contrast ratios

## Integration with Encryption

```jsx
import encryptionService from './services/encryption';

// After authority selection, encrypt complaint
const selectedAuthorityObjects = authorities.filter(
  auth => selectedAuthorities.includes(auth.id)
);

const encryptedPayload = await encryptionService.encryptComplaint(
  complaintData,
  selectedAuthorityObjects.map(auth => ({
    id: auth.id,
    publicKey: auth.publicKey
  }))
);
```

## Example Integration

See `AuthoritySelector.example.jsx` for a complete working example.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires Web Crypto API support for encryption functionality.

## License

Part of the Aawaaj project. See main project LICENSE.
