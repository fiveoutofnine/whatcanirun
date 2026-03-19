'use client';

import BoringAvatar from 'boring-avatars';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Avatar } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type UserAvatarProps = {
  className?: string;
  image?: string | null;
  name?: string | null;
  size?: number;
  icon?: React.ReactNode;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const UserAvatar: React.FC<UserAvatarProps> = ({ className, image, name, size = 40, icon }) => {
  return (
    <div className="relative" style={{ width: size, height: size, minWidth: size }}>
      {image ? (
        <Avatar.Root className={className} size={size}>
          <Avatar.Image src={image} />
          <Avatar.Fallback>{name ?? 'User avatar'}</Avatar.Fallback>
        </Avatar.Root>
      ) : (
        <div
          className={twMerge(
            clsx('overflow-hidden rounded-full border border-gray-6 bg-gray-5', className),
          )}
          style={{ width: size, height: size, minWidth: size }}
        >
          <BoringAvatar size={size} name={name ?? 'User avatar'} variant="beam" />
        </div>
      )}
      {icon ? (
        <div
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center overflow-hidden rounded-full"
          user-avatar-icon-container=""
        >
          {icon}
        </div>
      ) : null}
    </div>
  );
};

export default UserAvatar;
