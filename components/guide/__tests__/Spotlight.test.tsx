import { render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { Spotlight } from '../spotlightParts';

const hole = { x: 100, y: 200, width: 120, height: 40 };
const reach = Math.max(Dimensions.get('window').width, Dimensions.get('window').height);

describe('Spotlight', () => {
  it('cuts a rounded hole whose inner edge is the hole and whose corner is the ring radius', async () => {
    const screen = await render(<Spotlight hole={hole} radius="pill" />);
    const scrim = StyleSheet.flatten(screen.getByTestId('spotlight.scrim').props.style);
    // Inner edge = outer edge + border on every side; inner radius = outer radius - border.
    expect(scrim.left + scrim.borderWidth).toBe(hole.x);
    expect(scrim.top + scrim.borderWidth).toBe(hole.y);
    expect(scrim.width - scrim.borderWidth * 2).toBe(hole.width);
    expect(scrim.height - scrim.borderWidth * 2).toBe(hole.height);
    expect(scrim.borderRadius - scrim.borderWidth).toBe(hole.height / 2);
    expect(scrim.borderWidth).toBe(reach);
  });

  it('breathes the hole and the ring with the same transform', async () => {
    const screen = await render(<Spotlight hole={hole} radius={16} />);
    const scrim = StyleSheet.flatten(screen.getByTestId('spotlight.scrim').props.style);
    const ring = StyleSheet.flatten(screen.getByTestId('spotlight.ring').props.style);
    expect(ring).toMatchObject({ left: hole.x, top: hole.y, width: hole.width, height: hole.height });
    expect(scrim.transform).toBeDefined();
    expect(scrim.transform[0].scale).toBe(ring.transform[0].scale);
    expect(scrim.borderRadius - scrim.borderWidth).toBe(16);
  });

  it('falls back to a plain full scrim without a target', async () => {
    const screen = await render(<Spotlight hole={null} radius={16} />);
    const scrim = StyleSheet.flatten(screen.getByTestId('spotlight.scrim').props.style);
    expect(scrim.borderWidth).toBeUndefined();
    expect(screen.queryByTestId('spotlight.ring')).toBeNull();
  });
});
