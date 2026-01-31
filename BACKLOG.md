# Eidola Backlog

## Drawing / Canvas

### Eraser: Partial stroke erasing
**Status:** Backlog  
**Priority:** Nice-to-have  
**Added:** 2026-01-31

**Current behavior:** Eraser removes entire vector strokes that it touches.

**Desired behavior:** Eraser removes only the parts of strokes it touches, like a real eraser.

**Why it's hard:** Fabric.js stores drawings as vector paths (bezier curves). Partial erasing requires either:
1. Path splitting at intersection points (complex bezier math)
2. Converting to pixel-based canvas drawing (loses vector benefits)
3. Hybrid approach with offscreen raster canvas for erasing

**Workaround:** Users can use Undo to remove unwanted strokes.

---

## Completed (2026-01-31)

- ✅ Profile posts auth token fix (test users see own posts)
- ✅ Post count excludes expired posts
- ✅ Eraser removes whole strokes (v1 implementation)
