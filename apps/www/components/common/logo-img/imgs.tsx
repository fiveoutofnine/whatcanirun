import type { LogoImgProps } from './types';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export const GgmlImg: React.FC<LogoImgProps> = ({ className, size = 24, ...rest }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={twMerge(clsx('overflow-hidden rounded border border-gray-6 bg-gray-9', className))}
      src="data:image/webp;base64,UklGRswCAABXRUJQVlA4IMACAABQHgCdASrIAMgAPpFCnEmlpCKhLnEYALASCWlu4W5xG/N18m/3qbI/xH47/J2jSelWJjyqr+t74b0Ux/cI18KpXSEa+FUrpCNe/5BiefIxDpgVlIQXaQVRrCDSI4+aOyfAVTBHJML7JUMsdn4KQ9H5XEbs/EZGzLLzjyGGmrz+/zxAQAU7+jp6sQVG6PHKrrqHoeCxNwvcnvO9xG09CvKpPSPlG/0RvQAGc4xqd/QxZMJ4YSPtHKv7K5bNt+49Fxna4SxpLtktaTGbt6ZbNvg3P0NvwjVbfzV9BC3ZZF3/B/+G8LJBkyK77uXNsKpXSEa+FUrpCNfCqV0gMAD+/lYQI3zoFbMc9qF6fsumbx3uTLdBwf9Fo2O6K3A3Vz87CDVile9h8QrYJSiouKP5s11+kpgE+5e82VotZBZkZQKdeZQGiiOIzx95B6ibHGCa1DnB8EvbbzzfXXyiO2RjQ8jGrnbcfirJ2PnFuzayW9/xe9XM+NAHESPwlwcBmxqqdcbZZ4Jw30nc1ay+s83O/m07lt/sXjvqn9zJHz41ZrQNS6yccme7KpDNXKQnQ/W5olGsfY4AFs7d9aP0nuOfdX8uyefeGMOlg3CrdZvD+gIJPsj/l3bSHG2P3+5IOJ/dXhb/XmmoLORSQ3ujxAJNtuHvrk6qqFWwjlamcJ8rucclh2HhUbb3vvMwbWUmKEPicL4O9l2fqapvGLPQMRZGGnyGjQ6gTYQJp3vKDLFWsHZl9ikW1ul1UMq+PQT6frt0Iz6HDxE07AZbaebXpPs74c/8IA268f393vnAFIIxhCpBVzNltzAuDjvc9/J95/yboLo1sUZe5c8ze7OI5S1zrqcZYcTrV9ay9XEwhKoKC+FU4AgpLSNCvxAsBLiu5Ofjcb1Azv+zFIYGP5uXz4Xvio5hUCboptMvZEGscybGAAAAAA=="
      alt="GGML's logo."
      width={size}
      height={size}
      {...rest}
    />
  );
};

export const MlxImg: React.FC<LogoImgProps> = ({ className, size = 24, ...rest }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={twMerge(clsx('overflow-hidden rounded border border-gray-6 bg-gray-9', className))}
      src="data:image/webp;base64,UklGRpwDAABXRUJQVlA4IJADAAAQIACdASrIAMgAPp1OnkumJyOUSqwYWAnEtLd+Pkyb9afVnsvx/c8oN2sV/q0UdKg0WKCz+mHcrY3y6huVsb5dQ3K2N8uoblbG+XUCpB1EHgf0k5iSkZWCI+Qr6OmWtUYym3a1c7ScxFvAa+Vp7oZjOPGXHXclxBtescabg0IrUDb1FndQmcs7JS5INqBoLIflEvlUDO6vexB9bgRIWATCg3f9BpI6gKqUF8HWUO+VwV4N7Q/6NCTNyQHMH5dB5RmC3qdRhwl6Jp1CPfOlhlq5bm9Mh+i4L88tEGigC/HwGouJKiZIlD2HQ1RohWXUVUFn9MO5Wxvl1DcrY3y6huVsb5dQ3K2N8uhgAP7+tlAB1S+mYJFOeTHDr9jvewB4h4VbYMpogLvCQVEHr0LRp5ZxldYOd0Sj20bFDd8q+Nv5Ke5/w+MOIHOAdCQ7FUDKuBQrGgPxYsVHBvwKiaS0+gU46AXF1OcNMbLJk22Zhvq7PiC8EU8v8B0enApMROEuTszp595h6U1fUqZSAfudHBIKaj2cWeh6cMSj7RYaroxLUeENQgQbCZuzXxmQ9ztNkUTGxJH/NNa1RmWy33K5aDhQuSlhQD6f4l6huS+9USOyS4F9Z7HprB8r6PiSdqNfQy8noYxwuQIckZah6VuUooO185ucb6MgJj85wK6FPwDQpfRlXWP5ILPOzqXZ8P6Jpx73tngL4n6tku59j205Qi7SpIN/KIZTZFo5x9tGq+B3DqWI7v+h/Ea/vodH+vDb7IX4a9gXrZ0ajawNB976z3Bp5SGj+VbwBp/CHZwpgE7Ar9hsLeAxGsPKOPFAMS/BeYCmDm6uXxEj/SVG5iiqUyGdOaaFiSaAA5bllk/zJNWIQ1JRGQ6dlyocoIcbj01++l04vQkAGxrULQ9XNh0F6XD+kO0sKuEZi627t/wqhJhQxO6SzasN+ZrvcxT1TnBSrtM+os1kuwHjB18iAl+G3HQaySNOew7mmNqrw7mYmzXKXAROH3ycnH4R5P+EwmGuynLF2JWwlj2otyI6MwCFIIMl8C16WLqZbzg/QUY4O4p8qVwvO8d/S+DEuLLYM6KbONPhf1T3SQ5hVATkHNrtG164gObarPbdmzrGUzivZAZiIhBdF3p1BAva7EISeRJ8vxgWP73mIcL9ucjBBtQQekLVrMn0lNEeF9B/IN6PNaEM3vtKgzieNCmlmBPsAAAAAAA="
      alt="MLX's logo."
      width={size}
      height={size}
      {...rest}
    />
  );
};
