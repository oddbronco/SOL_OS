# Brand Guidelines - Clarity OS

## Overview
Clarity OS is a professional business analysis and requirements gathering platform designed for consultants, analysts, and project managers. The brand conveys professionalism, intelligence, and efficiency.

## Color Palette

### Primary Colors
- **Primary Blue**: `#3B82F6` (blue-500)
  - Used for primary actions, links, and key interactive elements
  - Conveys trust, professionalism, and reliability

- **Primary Hover**: `#2563EB` (blue-600)
  - Darker shade for hover states

### Secondary Colors
- **Success Green**: `#10B981` (green-500)
  - Completed states, success messages, positive indicators

- **Warning Yellow/Orange**: `#F59E0B` (amber-500)
  - Pending states, warnings, important notices

- **Error Red**: `#EF4444` (red-500)
  - Errors, destructive actions, critical alerts

- **Info Blue**: `#06B6D4` (cyan-500)
  - Informational messages, in-progress states

### Accent Colors
- **Purple**: `#8B5CF6` (purple-500)
  - AI features, premium functionality, special features
  - Used sparingly for differentiation (e.g., AI Interview Round)

- **Pink**: `#EC4899` (pink-500)
  - Gradients with purple for AI-powered features

### Neutral Colors (Light Mode)
- **Background**: `#FFFFFF` (white)
- **Surface**: `#F9FAFB` (gray-50)
- **Border**: `#E5E7EB` (gray-200)
- **Text Primary**: `#111827` (gray-900)
- **Text Secondary**: `#6B7280` (gray-600)
- **Text Tertiary**: `#9CA3AF` (gray-500)

### Neutral Colors (Dark Mode)
- **Background**: `#0F172A` (slate-900)
- **Surface**: `#1E293B` (slate-800)
- **Border**: `#334155` (slate-700)
- **Text Primary**: `#F8FAFC` (slate-50)
- **Text Secondary**: `#CBD5E1` (slate-300)
- **Text Tertiary**: `#94A3B8` (slate-400)

## Typography

### Font Family
- **Primary**: System font stack for optimal performance and native feel
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```

### Font Weights
- **Regular**: 400 (body text)
- **Medium**: 500 (labels, subheadings)
- **Semibold**: 600 (headings, emphasis)
- **Bold**: 700 (major headings, CTAs)

### Font Sizes
- **xs**: 0.75rem (12px) - Labels, captions
- **sm**: 0.875rem (14px) - Small text, secondary info
- **base**: 1rem (16px) - Body text
- **lg**: 1.125rem (18px) - Large body text
- **xl**: 1.25rem (20px) - Small headings
- **2xl**: 1.5rem (24px) - Section headings
- **3xl**: 1.875rem (30px) - Page headings
- **4xl**: 2.25rem (36px) - Hero headings

### Line Heights
- **Body Text**: 150% (1.5)
- **Headings**: 120% (1.2)
- **Tight**: 110% (1.1) - For large headings only

## Spacing System

Use the 8px spacing system (Tailwind's default):
- **xs**: 0.5rem (4px)
- **sm**: 0.75rem (6px)
- **base**: 1rem (8px)
- **md**: 1.5rem (12px)
- **lg**: 2rem (16px)
- **xl**: 3rem (24px)
- **2xl**: 4rem (32px)
- **3xl**: 6rem (48px)

## Component Styles

### Buttons

#### Primary Button
- Background: Primary Blue (`#3B82F6`)
- Text: White
- Hover: Primary Hover (`#2563EB`)
- Border Radius: 0.5rem (8px)
- Padding: 0.5rem 1rem (8px 16px)
- Font Weight: 500 (medium)

#### Secondary Button (Outline)
- Background: Transparent
- Border: 1px solid border color
- Text: Primary text color
- Hover: Light background tint
- Border Radius: 0.5rem (8px)

#### Ghost Button
- Background: Transparent
- No border
- Text: Primary text color
- Hover: Light background

#### Destructive Button
- Background: Error Red
- Text: White
- Use for delete, remove, destructive actions

### Cards
- Background: Surface color
- Border: 1px solid border color
- Border Radius: 0.75rem (12px)
- Padding: 1.5rem (24px)
- Shadow: Subtle (0 1px 3px rgba(0,0,0,0.1))

### Badges
- Border Radius: 9999px (fully rounded)
- Padding: 0.25rem 0.75rem (4px 12px)
- Font Size: 0.75rem (12px)
- Font Weight: 500 (medium)
- Colors match status (success, warning, error, info)

### Inputs
- Border: 1px solid border color
- Border Radius: 0.5rem (8px)
- Padding: 0.5rem 0.75rem (8px 12px)
- Focus: 2px ring in primary color
- Font Size: 1rem (16px)

### Modals
- Overlay: rgba(0, 0, 0, 0.5)
- Background: Surface color
- Border Radius: 1rem (16px)
- Max Width:
  - sm: 400px
  - md: 600px (default)
  - lg: 800px
  - xl: 1000px
- Padding: 1.5rem (24px)

## Icons

### Icon Library
- **Primary**: Lucide React
- **Size Standards**:
  - Small: 16px (h-4 w-4)
  - Default: 20px (h-5 w-5)
  - Large: 24px (h-6 w-6)
  - XL: 32px (h-8 w-8)

### Icon Usage
- Always pair with text for primary actions
- Use consistent sizing within the same context
- Color should match text color (inherit)
- Use filled variants sparingly (for active states)

## Gradients

### AI Feature Gradient
```css
background: linear-gradient(to bottom right, #8B5CF6, #EC4899);
```
Used exclusively for AI-powered features to differentiate them.

### Subtle Background Gradients
```css
background: linear-gradient(to bottom, #F9FAFB, #FFFFFF);
```
Used for hero sections, landing areas (light mode only).

## Animation & Transitions

### Duration
- **Fast**: 150ms - Hover states, small interactions
- **Default**: 200ms - Most transitions
- **Slow**: 300ms - Complex animations, page transitions

### Easing
- **Default**: ease-in-out
- **Enter**: ease-out
- **Exit**: ease-in

### Common Transitions
- `transition-colors duration-200` - Color changes
- `transition-transform duration-200` - Scale, position
- `transition-all duration-200` - Multiple properties

## Status Colors & Meanings

### Project/Task Status
- **Active**: Blue (`#3B82F6`)
- **Completed**: Green (`#10B981`)
- **Pending**: Yellow/Amber (`#F59E0B`)
- **Cancelled/Inactive**: Gray (`#6B7280`)
- **In Progress**: Cyan (`#06B6D4`)

### Priority Levels
- **High**: Red (`#EF4444`)
- **Medium**: Yellow (`#F59E0B`)
- **Low**: Green (`#10B981`)

### Interview Status
- **Pending**: Amber badge
- **In Progress**: Blue badge
- **Completed**: Green badge
- **Cancelled**: Gray badge

## Dark Mode Considerations

### Implementation
- Use Tailwind's `dark:` variant for all color changes
- Ensure sufficient contrast (WCAG AA minimum)
- Reduce pure white to off-white (`#F8FAFC`) to reduce eye strain
- Use slightly lighter borders in dark mode for definition

### Color Adjustments
- Reduce saturation slightly in dark mode for comfort
- Use darker shadows or borders instead of light shadows
- Ensure interactive elements remain clearly visible

## Accessibility

### Contrast Ratios
- **Normal Text**: Minimum 4.5:1
- **Large Text**: Minimum 3:1
- **Interactive Elements**: Minimum 3:1

### Focus States
- Always provide visible focus indicators
- Use 2px ring in primary color
- Ring offset: 2px for better visibility

### Interactive Elements
- Minimum touch target: 44x44px (mobile)
- Minimum click target: 32x32px (desktop)
- Ensure keyboard navigation works for all interactions

## Best Practices

### DO:
- Use consistent spacing throughout the application
- Follow the established color palette
- Maintain visual hierarchy with typography
- Provide clear feedback for user actions
- Use loading states for async operations
- Show error messages clearly
- Use icons to support text, not replace it
- Test in both light and dark modes
- Ensure mobile responsiveness

### DON'T:
- Use purple/indigo for standard features (reserve for AI)
- Mix different spacing systems
- Use low-contrast color combinations
- Create custom colors outside the palette
- Use more than 3 font weights in a single view
- Animate excessively (causes distraction)
- Forget hover/focus states
- Use color as the only indicator (accessibility)

## Component Patterns

### Page Layout
```
Header (sticky)
  ├── Logo/Title
  ├── Navigation
  └── User Menu

Main Content
  ├── Page Title (3xl font, semibold)
  ├── Actions Bar (right-aligned)
  └── Content Cards/Sections

Sidebar (when applicable)
  ├── Fixed width: 256px
  └── Collapsible on mobile
```

### Card Layout
```
Card
  ├── Header
  │   ├── Icon (optional)
  │   ├── Title
  │   └── Actions
  ├── Content
  └── Footer (optional)
```

### Modal Layout
```
Modal
  ├── Header
  │   ├── Title
  │   └── Close Button
  ├── Body
  │   └── Form/Content
  └── Footer
      ├── Cancel Button (outline)
      └── Primary Action Button
```

## Voice & Tone

### Writing Style
- **Professional but approachable**: Clear, concise, helpful
- **Action-oriented**: Use verbs that describe what will happen
- **Positive framing**: "Complete setup" vs "Setup incomplete"
- **User-focused**: "Your projects" vs "Projects"

### Button Text
- **Be specific**: "Create Project" vs "Submit"
- **Use sentence case**: "Save changes" not "SAVE CHANGES"
- **Keep it short**: 1-3 words ideal

### Error Messages
- **Be helpful**: Explain what went wrong and how to fix it
- **Be specific**: "Email already exists" vs "Error"
- **Be polite**: Avoid blame ("Unable to..." vs "You failed to...")

### Success Messages
- **Confirm the action**: "Project created successfully"
- **Next steps**: "Interview session created. Share the link with stakeholders."

## Special Features

### AI Features
Always distinguish AI-powered features visually:
- Use purple/pink gradient backgrounds
- Include sparkle (✨) icon
- Add "AI" prefix or badge to labels
- Use slightly different styling to stand out

Example: "AI Interview Round" button with sparkle icon and gradient background.

### Loading States
- Use subtle animations (pulse, spin)
- Show skeleton screens for list content
- Display loading text for actions
- Disable interactive elements during loading

### Empty States
- Use friendly illustrations or icons
- Provide helpful guidance on what to do next
- Include a clear call-to-action button
- Keep the message concise and encouraging

## File Organization

### Component Structure
```
ComponentName/
  ├── index.tsx (main component)
  ├── ComponentName.tsx (if complex)
  ├── types.ts (TypeScript interfaces)
  └── styles.module.css (if needed)
```

### Naming Conventions
- **Components**: PascalCase (e.g., `InterviewDashboard`)
- **Files**: PascalCase for components, camelCase for utilities
- **Functions**: camelCase (e.g., `handleCreateInterview`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **CSS Classes**: kebab-case (e.g., `interview-card`)

## Updates & Evolution

This brand guidelines document should be updated when:
- New color schemes are introduced
- Component patterns change
- New UI paradigms are adopted
- Accessibility requirements evolve
- User feedback indicates confusion

Last Updated: November 1, 2025
