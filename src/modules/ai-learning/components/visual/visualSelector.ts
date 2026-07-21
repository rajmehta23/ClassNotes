import { ANIMATION_REGISTRY } from './AnimationRegistry';
import type { AnimationTopicDef } from './AnimationRegistry';

export function selectVisualAnimation(
  noteTitle: string, 
  noteSubject?: string
): AnimationTopicDef | null {
  const text = `${noteTitle} ${noteSubject || ''}`.toLowerCase();

  if (text.includes('projectile') || text.includes('trajectory') || text.includes('throw') || text.includes('parabola')) {
    return ANIMATION_REGISTRY.projectile_motion;
  }

  if (text.includes('force') || text.includes('newton') || text.includes('acceleration') || text.includes('motion')) {
    return ANIMATION_REGISTRY.force;
  }

  if (text.includes('gravity') || text.includes('gravitational') || text.includes('orbit') || text.includes('kepler')) {
    return ANIMATION_REGISTRY.gravity;
  }

  if (text.includes('momentum') || text.includes('collision') || text.includes('impulse') || text.includes('velocity')) {
    return ANIMATION_REGISTRY.momentum;
  }

  if (text.includes('electric') || text.includes('circuit') || text.includes('ohm') || text.includes('voltage') || text.includes('current')) {
    return ANIMATION_REGISTRY.electricity;
  }

  if (text.includes('magnet') || text.includes('magnetic') || text.includes('dipole') || text.includes('field')) {
    return ANIMATION_REGISTRY.magnetism;
  }

  if (text.includes('friction') || text.includes('coefficient') || text.includes('sliding') || text.includes('normal force')) {
    return ANIMATION_REGISTRY.friction;
  }

  // Fallback to null if no matching topic is found
  return null;
}
