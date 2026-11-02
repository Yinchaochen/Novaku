import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PosterCover } from '../PosterCover';
import type { PosterSpec } from '../../../lib/posterCover';

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: { testID?: string }) => <View {...props} testID={props.testID ?? 'poster.base'} />,
  };
});
jest.mock('../../../hooks/useCoverFaceReady', () => ({ useCoverFaceReady: () => true }));

const SPEC: PosterSpec = {
  base: 'https://media.example/base.jpg',
  subject: 'https://media.example/subject.webp',
  paper: '#FBF0DE',
  ink: '#668C1C',
  title_ink: '#3B5110',
  word_box: { x: 0.016, y: 0.245, w: 0.968, h: 0.36 },
  title_box: { x: 0.06, y: 0.05, w: 0.88, h: 0.1585 },
  subject_grid: [],
};

const measure = (node: Parameters<typeof fireEvent>[0], widthAt100: number) =>
  act(async () => {
    fireEvent(node, 'layout', { nativeEvent: { layout: { width: widthAt100, height: 140, x: 0, y: 0 } } });
  });

const styleOf = (node: { props: Record<string, unknown> }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

describe('PosterCover', () => {
  it('stacks the base, then the words, then the subject over them', async () => {
    const view = await render(<PosterCover spec={SPEC} word="stacked" title="The title" width={184.5} />);
    const ids = (view.toJSON() as unknown as { children: { props: { testID?: string } }[] }).children.map(
      (child) => child.props.testID,
    );
    expect(ids.slice(0, 4)).toEqual(['poster.base', 'poster.word-box', 'poster.title-box', 'poster.subject']);
  });

  it('is 3:4 at any width', async () => {
    const view = await render(<PosterCover spec={SPEC} word="" title="" width={240} />);
    const root = (view.toJSON() as unknown as { props: { style: unknown } }).props;
    expect(StyleSheet.flatten(root.style as never)).toMatchObject({ width: 240, height: 320 });
  });

  it('holds the word back until it is measured, then fits it to the box', async () => {
    const view = await render(<PosterCover spec={SPEC} word="first" title="" width={184.5} />);
    expect(view.queryByTestId('poster.word')).toBeNull();
    await measure(view.getByTestId('poster.measure'), 300);
    const word = view.getByTestId('poster.word');
    expect(word.props.children).toBe('FIRST');
    expect(styleOf(word).fontSize as number).toBeCloseTo((0.968 * 184.5 * 0.97) / 3, 3);
  });

  it('changes the size of a word and nothing else about its shape', async () => {
    const view = await render(<PosterCover spec={SPEC} word="shape" title="" width={184.5} />);
    await measure(view.getByTestId('poster.measure'), 200);
    const style = styleOf(view.getByTestId('poster.word'));
    expect(style.transform).toBeUndefined();
    expect(style.letterSpacing).toBeUndefined();
  });

  it('remembers a measured line, so a recycled cell draws it at once', async () => {
    const first = await render(<PosterCover spec={SPEC} word="again" title="" width={184.5} />);
    await measure(first.getByTestId('poster.measure'), 250);
    await first.unmount();
    const second = await render(<PosterCover spec={SPEC} word="again" title="" width={240} />);
    expect(second.getByTestId('poster.word')).toBeTruthy();
  });

  it('redraws when the font lands and the same line measures wider', async () => {
    const view = await render(<PosterCover spec={SPEC} word="swap" title="" width={184.5} />);
    const measurer = view.getByTestId('poster.measure');
    await measure(measurer, 200);
    const before = styleOf(view.getByTestId('poster.word')).fontSize as number;
    await measure(measurer, 300);
    expect(styleOf(view.getByTestId('poster.word')).fontSize as number).toBeLessThan(before);
  });

  it('measures each line a broken phrase might use', async () => {
    const view = await render(<PosterCover spec={SPEC} word="wait here" title="" width={184.5} />);
    expect(view.getAllByTestId('poster.measure').map((n) => n.props.children)).toEqual(['WAIT HERE', 'WAIT', 'HERE']);
  });

  it('ignores a layout that reports nothing', async () => {
    const view = await render(<PosterCover spec={SPEC} word="zero" title="" width={184.5} />);
    await measure(view.getByTestId('poster.measure'), 0);
    expect(view.queryByTestId('poster.word')).toBeNull();
  });

  it('draws in the system face, heavy, when it has none for the script', async () => {
    const view = await render(<PosterCover spec={SPEC} word="ค่อยๆ" title="" width={184.5} />);
    await measure(view.getByTestId('poster.measure'), 200);
    const style = styleOf(view.getByTestId('poster.word'));
    expect(style.fontFamily).toBeUndefined();
    expect(style.fontWeight).toBe('900');
  });

  it('sets an Arabic title from the right', async () => {
    const view = await render(<PosterCover spec={SPEC} word="" title="أول صديق" width={184.5} />);
    expect(styleOf(view.getByTestId('poster.title'))).toMatchObject({ textAlign: 'right', writingDirection: 'rtl' });
  });

  it('holds the title to the lines its box has', async () => {
    const long = 'Wie lange es bis zum ersten Freund in Deutschland dauerte '.repeat(4);
    const view = await render(<PosterCover spec={SPEC} word="" title={long} width={148} />);
    const title = view.getByTestId('poster.title');
    const { lineHeight } = styleOf(title);
    expect(title.props.numberOfLines * (lineHeight as number)).toBeLessThanOrEqual((0.1585 * 148) / 0.75);
  });

  it('survives a missing word, title, subject or base', async () => {
    const view = await render(<PosterCover spec={{ ...SPEC, base: '', subject: '' }} word="" title="" width={184.5} />);
    expect(view.queryByTestId('poster.word')).toBeNull();
    expect(view.queryByTestId('poster.title')).toBeNull();
    expect(view.queryByTestId('poster.subject')).toBeNull();
    expect(view.queryByTestId('poster.base')).toBeNull();
  });
});
