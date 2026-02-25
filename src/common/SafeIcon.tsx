import React from 'react';
import * as FiIcons from 'react-icons/fi';
import { FiAlertTriangle } from 'react-icons/fi';
import { IconType } from 'react-icons';

interface SafeIconProps {
  icon?: IconType;
  name?: string;
  [key: string]: any;
}

// Type guard to check if a string is a valid key of FiIcons
function isIconKey(key: string): key is keyof typeof FiIcons {
  return key in FiIcons;
}

const SafeIcon: React.FC<SafeIconProps> = ({ icon, name, ...props }) => {
  let IconComponent: IconType | undefined = icon;

  if (!IconComponent && name) {
    const iconName = `Fi${name}`;
    if (isIconKey(iconName)) {
      IconComponent = FiIcons[iconName];
    }
  }

  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  return <FiAlertTriangle {...props} />;
};

export default SafeIcon;
