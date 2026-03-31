import type { LogoImgProps } from './types';

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const imgClasses = 'overflow-hidden rounded border border-gray-6 bg-gray-9';

export const NvidiaImg: React.FC<LogoImgProps> = ({ className, size = 24, ...rest }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={twMerge(clsx(imgClasses, className))}
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%2376b900'/%3E%3Cpath d='M9.2 9.5c2.5-.7 4.6.8 4.6.8l.1-2.4c0 0-2.3-1.4-5.3-.5-3.2 1-4.2 4-4.2 4s1.5-1 4.8-1.9zm-.5 2.4c1.9-.5 3.5.6 3.5.6l.1-1.8s-1.7-1-3.9-.4c-2.4.7-3.3 2.7-3.3 2.7s.9-.6 3.6-1.1zm10.4-2.1c-1.4-2.7-4.7-3.4-7.6-2.5-3 .9-4.9 2.5-4.9 2.5l.1 3.8s2.1-2.8 5.5-3.8c2.7-.8 4.8.3 4.8.3V8.3s-.6-.3-1.6-.4l.1 2.5s.9.3 1.3.8l.1-1.8c.4.3 1.2 1.2 1.5 2.4.4-1 .7-.6.7-.6v2.2c-.5-1.6-2.2-2.6-2.2-2.6l-.1 2c.8.7 1.2 1.5 1.2 2.4 0 2.2-2.5 4-5.6 4-3.1 0-5.6-1.8-5.6-4 0-1.1.6-2.1 1.7-2.8l-.1-1.6C5.5 12.5 4.4 14 4.4 15.7c0 3 3 5.3 6.7 5.3 3.7 0 6.7-2.4 6.7-5.3 0-2-1.3-3.7-3.2-4.6l.1-2.4c2.6 1.2 4.2 3.6 4.2 6.5 0 0 .5-2.5-1.8-5.8z' fill='white'/%3E%3C/svg%3E"
      alt="NVIDIA's logo."
      width={size}
      height={size}
      {...rest}
    />
  );
};

export const AmdImg: React.FC<LogoImgProps> = ({ className, size = 24, ...rest }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={twMerge(clsx(imgClasses, className))}
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23000'/%3E%3Cpath d='M18.3 5.7L15.7 3H3v17h5.7l2.6-2.7h7V5.7zM16.5 15h-4l-2 2H6.3V7h10.2v8z' fill='white'/%3E%3Crect x='8.5' y='9' width='5.5' height='4' fill='white'/%3E%3C/svg%3E"
      alt="AMD's logo."
      width={size}
      height={size}
      {...rest}
    />
  );
};

export const IntelImg: React.FC<LogoImgProps> = ({ className, size = 24, ...rest }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={twMerge(clsx(imgClasses, className))}
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%230071c5'/%3E%3Ctext x='12' y='15.5' font-family='Arial,sans-serif' font-weight='bold' font-size='8' fill='white' text-anchor='middle'%3Eintel%3C/text%3E%3C/svg%3E"
      alt="Intel's logo."
      width={size}
      height={size}
      {...rest}
    />
  );
};

export const AppleImg: React.FC<LogoImgProps> = ({ className, size = 24, ...rest }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={twMerge(clsx(imgClasses, className))}
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23000'/%3E%3Cpath d='M16.5 20c-.7.9-1.5.8-2.2.5-.8-.3-1.4-.3-2.3 0-.9.4-1.4.3-2-.5C6.8 16.2 7.3 10.8 10.8 10.6c.9 0 1.5.5 2 .5s1.5-.6 2.5-.5c.4 0 1.7.2 2.4 1.4-2.1 1.3-1.6 4.2.5 5l-.4 1.1c-.5 1.2-.8 1.6-1.3 1.9zM14.5 4c.1 2-1.7 3.5-3.5 3.4-.2-1.8 1.7-3.5 3.5-3.4z' fill='white'/%3E%3C/svg%3E"
      alt="Apple's logo."
      width={size}
      height={size}
      {...rest}
    />
  );
};

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
