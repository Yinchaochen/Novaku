import { buttonWidthFor } from '../googleButtonWidth';

describe('buttonWidthFor', () => {
  it('clamps to the range Google accepts', () => {
    expect(buttonWidthFor(120)).toBe(200);
    expect(buttonWidthFor(333.7)).toBe(333);
    expect(buttonWidthFor(900)).toBe(400);
  });

  it('is unchanged by a scrollbar appearing beside a wide form', () => {
    // 460px form, 15px classic scrollbar: same button, so no redraw and no loop.
    expect(buttonWidthFor(460)).toBe(buttonWidthFor(445));
  });
});
