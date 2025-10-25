import React from 'react';
import * as FiIcons from 'react-icons/fi';
import { FiAlertTriangle } from 'react-icons/fi';
import { IconType } from 'react-icons';

interface SafeIconProps {
  icon?: IconType;
  name?: string;
  [key: string]: any;
}

const SafeIcon: React.FC<SafeIconProps> = ({ icon, name, ...props }) => {
  let IconComponent: IconType | undefined;
  try {
    IconComponent = icon || (name && (FiIcons as any)[`Fi${name}`]);
  } catch (e) {
    IconComponent = undefined;
  }

  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  return <FiAlertTriangle {...props} />;
};

export default SafeIcon;
