import { useRef, ReactNode, CSSProperties } from 'react'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** max rotation in degrees — keep small for "subtle 3D" */
  max?: number
}

export default function TiltCard({ children, className, style, max = 5 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // -0.5..0.5 from center
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transition = 'transform 60ms linear'
    el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-2px)`
  }

  const onMouseLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transition = 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)'
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
  }

  return (
    <div ref={ref} className={className} style={style} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      {children}
    </div>
  )
}
