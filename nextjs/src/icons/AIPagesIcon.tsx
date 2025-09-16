import { SvgProps } from '@/types/assets'
import React from 'react'

const AIPagesIcon = ({height, width, className, fill}:SvgProps) => {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill={fill}>
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
    <path d="M8,12V14H16V12H8M8,16V18H13V16H8Z" fill="white"/>
    <path d="M8,8V10H16V8H8Z" fill="white"/>
</svg>
  )
}

export default AIPagesIcon
