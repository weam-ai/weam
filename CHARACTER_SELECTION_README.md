# Character Selection Feature

## Overview
This feature allows users to select agent avatars from a predefined character library or upload custom images. It integrates seamlessly with the existing Custom GPT creation flow.

## Features

### 1. Character Library
- **Business Characters**: Business Professional, Corporate Executive, Entrepreneur, Team Leader
- **Creative Characters**: Designer, Artist, Writer, Innovator
- **Technical Characters**: Developer, Engineer, Data Scientist, System Admin
- **Service Characters**: Customer Support, Sales Representative, Consultant, Trainer

### 2. Custom Image Upload
- Drag and drop functionality
- File browser support
- Image preview
- Supports JPG, JPEG, PNG, GIF formats

## How It Works

### Integration Points
1. **Custom GPT Overview Page**: Users can select characters or upload images when creating new agents
2. **Agent List Display**: Selected images appear in the agent list view
3. **Thunderbolt Dialog**: Selected images are visible in the agent selection dialog

### User Experience
1. Click "🎭 Choose from Character Library" button
2. Select from two tabs:
   - **Characters**: Browse and select from predefined character categories
   - **Upload**: Drag & drop or browse for custom images
3. Selected image appears in the agent creation form
4. Image is saved with the agent and displayed in lists

## Technical Implementation

### Components
- `CharacterSelectionDialog.tsx`: Main dialog component with tabs
- `Overview.tsx`: Integration with existing Custom GPT form

### Key Features
- Maintains existing `FileUploadCustom` functionality
- Adds character selection capability
- Preserves form validation and data flow
- Responsive design with proper mobile support

### Data Handling
- Character selections are marked with `isCharacter: true` flag
- Custom uploads work as before with file objects
- Both types update `previewCoverImg` for immediate display
- Backward compatibility maintained

## Customization

### Adding New Characters
1. Update `DEFAULT_CHARACTERS` object in `CharacterSelectionDialog.tsx`
2. Add new categories and character objects
3. Replace placeholder images (`/defaultgpt.jpg`) with actual character images

### Styling
- Uses existing design system classes (`bg-b11`, `text-b2`, etc.)
- Responsive grid layout for character selection
- Hover effects and transitions
- Consistent with existing UI components

## Future Enhancements
- Character search functionality
- Favorite characters
- Character categories based on agent type
- AI-generated character suggestions
- Character customization options

## Notes
- Current implementation uses placeholder images (`/defaultgpt.jpg`)
- Character selections don't create actual file objects (maintains compatibility)
- Existing file upload functionality remains unchanged
- Form validation works for both character and file selections

