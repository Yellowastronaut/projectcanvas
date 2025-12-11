import { useStore } from '../store/useStore'

export function SnapGuides() {
  const { snapGuides, transform } = useStore()

  if (snapGuides.length === 0) return null

  const getGuideStyle = (guide: typeof snapGuides[0]) => {
    if (guide.type === 'vertical') {
      return {
        left: guide.position,
        top: guide.start,
        width: 1,
        height: guide.end - guide.start,
        backgroundColor: '#522CEC',
      }
    } else if (guide.type === 'horizontal') {
      return {
        left: guide.start,
        top: guide.position,
        width: guide.end - guide.start,
        height: 1,
        backgroundColor: '#522CEC',
      }
    } else {
      // Spacing guide - show as a dashed line with gap indicator
      return null // Handled separately
    }
  }

  return (
    <>
      {snapGuides.map((guide, index) => {
        if (guide.type === 'spacing' && guide.gap) {
          // Spacing indicator - show gap value
          const overlapLength = Math.abs(guide.end - guide.start)
          const hasOverlap = overlapLength > 0
          const isHorizontalGap = guide.direction === 'horizontal'

          if (isHorizontalGap) {
            // Horizontal gap (images side by side)
            // position = x-center of gap, start/end = y-coordinates of overlap
            return (
              <div key={index} className="absolute pointer-events-none">
                {hasOverlap && (
                  <>
                    {/* Horizontal dashed lines at top and bottom of overlap */}
                    <div
                      style={{
                        position: 'absolute',
                        left: guide.position - guide.gap / 2,
                        top: guide.start,
                        width: guide.gap,
                        height: 0,
                        borderTop: '1px dashed #522CEC',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: guide.position - guide.gap / 2,
                        top: guide.end,
                        width: guide.gap,
                        height: 0,
                        borderTop: '1px dashed #522CEC',
                      }}
                    />
                    {/* Vertical connector lines at left and right edges of gap */}
                    <div
                      style={{
                        position: 'absolute',
                        left: guide.position - guide.gap / 2,
                        top: guide.start,
                        width: 0,
                        height: overlapLength,
                        borderLeft: '1px dashed #522CEC',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: guide.position + guide.gap / 2,
                        top: guide.start,
                        width: 0,
                        height: overlapLength,
                        borderLeft: '1px dashed #522CEC',
                      }}
                    />
                  </>
                )}
                {/* Gap value label - centered in the gap */}
                <div
                  className="absolute bg-[#522CEC] text-white font-mono rounded"
                  style={{
                    left: guide.position - 15 / transform.scale,
                    top: guide.start + overlapLength / 2 - 10 / transform.scale,
                    fontSize: 10 / transform.scale,
                    padding: `${2 / transform.scale}px ${4 / transform.scale}px`,
                  }}
                >
                  {Math.round(guide.gap)}
                </div>
              </div>
            )
          } else {
            // Vertical gap (images stacked)
            // position = y-center of gap, start/end = x-coordinates of overlap
            return (
              <div key={index} className="absolute pointer-events-none">
                {hasOverlap && (
                  <>
                    {/* Vertical dashed lines at left and right of overlap */}
                    <div
                      style={{
                        position: 'absolute',
                        left: guide.start,
                        top: guide.position - guide.gap / 2,
                        width: 0,
                        height: guide.gap,
                        borderLeft: '1px dashed #522CEC',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: guide.end,
                        top: guide.position - guide.gap / 2,
                        width: 0,
                        height: guide.gap,
                        borderLeft: '1px dashed #522CEC',
                      }}
                    />
                    {/* Horizontal connector lines at top and bottom edges of gap */}
                    <div
                      style={{
                        position: 'absolute',
                        left: guide.start,
                        top: guide.position - guide.gap / 2,
                        width: overlapLength,
                        height: 0,
                        borderTop: '1px dashed #522CEC',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: guide.start,
                        top: guide.position + guide.gap / 2,
                        width: overlapLength,
                        height: 0,
                        borderTop: '1px dashed #522CEC',
                      }}
                    />
                  </>
                )}
                {/* Gap value label - centered in the gap */}
                <div
                  className="absolute bg-[#522CEC] text-white font-mono rounded"
                  style={{
                    left: guide.start + overlapLength / 2 - 15 / transform.scale,
                    top: guide.position - 10 / transform.scale,
                    fontSize: 10 / transform.scale,
                    padding: `${2 / transform.scale}px ${4 / transform.scale}px`,
                  }}
                >
                  {Math.round(guide.gap)}
                </div>
              </div>
            )
          }
        }

        const style = getGuideStyle(guide)
        if (!style) return null

        return (
          <div
            key={index}
            className="absolute pointer-events-none"
            style={style}
          />
        )
      })}
    </>
  )
}
