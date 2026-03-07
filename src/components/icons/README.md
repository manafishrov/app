# Custom Icons

This directory contains custom SVG icon components for the Manafish ROV application.

## Available Icons

### DiveIcon
A dive/depth icon showing wavy water surface with dots and a downward arrow. Used for indicating diving or depth-related actions.

**Usage:**
```tsx
import { DiveIcon } from '@/components/icons';

<DiveIcon class="h-12 w-12 text-foreground" />
```

### DirectionIcon
A directional control icon showing a joystick-like shape with arrow indicators in four directions. Used for indicating directional movement or navigation controls.

**Usage:**
```tsx
import { DirectionIcon } from '@/components/icons';

<DirectionIcon class="h-12 w-12 text-foreground" />
```

### PropellerIcon
A propeller/thruster icon showing a spinning propeller shape with decorative dots. Used for indicating thruster or propulsion-related actions.

**Usage:**
```tsx
import { PropellerIcon } from '@/components/icons';

<PropellerIcon class="h-12 w-12 text-foreground" />
```

### DirectionIcon
A directional control icon showing a diagonal tool/pointer with arrows pointing in four directions. Used for indicating directional movement or navigation controls.

**Usage:**
```tsx
import { DirectionIcon } from '@/components/icons';

<DirectionIcon class="h-12 w-12 text-foreground" />
```

## Importing Icons

You can import individual icons:

```tsx
import { DiveIcon } from '@/components/icons/DiveIcon';
import { PropellerIcon } from '@/components/icons/PropellerIcon';
```

Or import all icons at once:

```tsx
import { DiveIcon, PropellerIcon } from '@/components/icons';
```

## Props

Both icon components accept all standard SVG attributes through `JSX.SvgSVGAttributes<SVGSVGElement>`, including:

- `class` - CSS class names
- `width` - SVG width (default: 72)
- `height` - SVG height (default: 72)
- `viewBox` - SVG viewBox (default: "0 0 72 72")
- Any other SVG attributes

## Styling

The icons use `currentColor` for fill, so they inherit the text color from their parent element. Use Tailwind classes like `text-foreground`, `text-primary`, etc. to change their color.
