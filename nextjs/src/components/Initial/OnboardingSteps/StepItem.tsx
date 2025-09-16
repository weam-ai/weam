'use client';
import React from 'react';

/**
 * Props for the StepItem component
 */
interface StepItemProps {
  /** Icon element to display */
  icon: React.ReactNode;
  /** Title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Layout direction - 'row' for horizontal, 'column' for vertical */
  layout?: 'row' | 'column';
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the title */
  titleClassName?: string;
  /** Additional CSS classes for the description */
  descriptionClassName?: string;
}

/**
 * Reusable component for displaying onboarding step items with icon, title, and description
 */
const StepItem = ({
  icon,
  title,
  description,
  layout = 'row',
  className = '',
  titleClassName = 'text-font-16 font-medium',
  descriptionClassName = 'text-font-14 text-b5',
}: StepItemProps) => {
  const isRow = layout === 'row';
  
  return (
    <div className={`${isRow ? 'flex items-center md:flex-row flex-col gap-x-3' : ''} ${className}`.trim()}>
      <div>{icon}</div>
      <div>
        <p className={titleClassName}>{title}</p>
        {description && <p className={descriptionClassName}>{description}</p>}
      </div>
    </div>
  );
};

export default StepItem;


