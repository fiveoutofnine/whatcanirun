'use client';

import { useMemo } from 'react';

import { sliderRangeStyles, sliderStyles, sliderThumbStyles, sliderTrackStyles } from './styles';
import type { SliderProps } from './types';
import * as SliderPrimitive from '@radix-ui/react-slider';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const Slider: React.FC<SliderProps> = ({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  disabled,
  ...props
}) => {
  const _values = useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={twMerge(clsx(sliderStyles, className))}
      disabled={disabled}
      data-disabled={disabled}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={clsx(sliderTrackStyles)}
        data-disabled={disabled}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={clsx(sliderRangeStyles)}
          data-disabled={disabled}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={clsx(sliderThumbStyles)}
          data-disabled={disabled}
        />
      ))}
    </SliderPrimitive.Root>
  );
};

export default Slider;
