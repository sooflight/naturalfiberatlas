import React, { useEffect, useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Optional one-time retry source before rendering the error placeholder. */
  fallbackSrc?: string;
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)
  const [didRetryFallback, setDidRetryFallback] = useState(false)
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined)

  const { src, alt, style, className, fallbackSrc, onError, ...rest } = props

  useEffect(() => {
    setDidError(false)
    setDidRetryFallback(false)
    setResolvedSrc(typeof src === 'string' ? src : undefined)
  }, [src])

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const fallback = typeof fallbackSrc === 'string' ? fallbackSrc.trim() : ''
    const current = typeof resolvedSrc === 'string' ? resolvedSrc.trim() : ''
    if (!didRetryFallback && fallback && fallback !== current) {
      setDidRetryFallback(true)
      setResolvedSrc(fallback)
      onError?.(event)
      return
    }
    setDidError(true)
    onError?.(event)
  }

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
      </div>
    </div>
  ) : (
    <img src={resolvedSrc} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}
