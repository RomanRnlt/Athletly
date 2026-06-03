// SPDX-License-Identifier: MIT
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface GoogleLogoProps {
  size?: number;
}

/**
 * Official multi-color Google "G" logo per the brand guidelines.
 * https://developers.google.com/identity/branding-guidelines
 */
export function GoogleLogo({ size = 20 }: GoogleLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M46.94 24.55c0-1.57-.14-3.07-.39-4.52H24v8.55h12.86c-.55 2.97-2.23 5.49-4.76 7.18v5.98h7.69c4.5-4.14 7.15-10.25 7.15-17.19z"
      />
      <Path
        fill="#34A853"
        d="M24 47.5c6.43 0 11.81-2.13 15.74-5.76l-7.69-5.98c-2.13 1.43-4.87 2.28-8.05 2.28-6.19 0-11.43-4.18-13.31-9.79H2.74v6.18C6.65 41.94 14.69 47.5 24 47.5z"
      />
      <Path
        fill="#FBBC04"
        d="M10.69 28.25c-.49-1.43-.77-2.96-.77-4.55s.28-3.12.77-4.55v-6.18H2.74C1.13 16.16.25 19.97.25 24s.88 7.84 2.49 11.03l7.95-6.18z"
      />
      <Path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.63 1.21 9.1 3.57l6.82-6.82C35.81 2.49 30.43.5 24 .5 14.69.5 6.65 6.06 2.74 13.97l7.95 6.18C12.57 13.68 17.81 9.5 24 9.5z"
      />
    </Svg>
  );
}

export default GoogleLogo;
