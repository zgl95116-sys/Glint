import React from 'react';
import { buildGlintHaloSvg } from '../constants/brand';

interface GlintHaloMarkProps {
  className?: string;
  size?: number;
}

export const GlintHaloMark: React.FC<GlintHaloMarkProps> = ({
  className,
  size = 24,
}) => {
  return (
    <span
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: buildGlintHaloSvg({ size }),
      }}
    />
  );
};
