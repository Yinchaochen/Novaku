import {
  OPACITY_BUSY,
  OPACITY_INCOMPLETE,
  publishButtonState,
} from '../publishButtonState';

const ready = { isSubmitting: false, isUploadingMedia: false, canSubmit: true };

describe('publishButtonState', () => {
  it('is solid and pressable once the schema is satisfied', () => {
    expect(publishButtonState(ready)).toEqual({ disabled: false, opacity: 1 });
  });

  // The regression this file exists for: an incomplete form used to disable the
  // button, so onInvalid never ran and the reader got a pale button and silence.
  it('stays pressable on an incomplete form so the press can say why', () => {
    expect(publishButtonState({ ...ready, canSubmit: false })).toEqual({
      disabled: false,
      opacity: OPACITY_INCOMPLETE,
    });
  });

  it('is dead while a submit is in flight', () => {
    expect(publishButtonState({ ...ready, isSubmitting: true })).toEqual({
      disabled: true,
      opacity: OPACITY_BUSY,
    });
  });

  it('is dead while media is still uploading', () => {
    expect(publishButtonState({ ...ready, isUploadingMedia: true })).toEqual({
      disabled: true,
      opacity: OPACITY_BUSY,
    });
  });

  it('counts busy before incomplete: a double tap must not re-enter submit', () => {
    expect(
      publishButtonState({ isSubmitting: true, isUploadingMedia: false, canSubmit: false }),
    ).toEqual({ disabled: true, opacity: OPACITY_BUSY });
  });

  it('never dims a ready button', () => {
    expect(publishButtonState(ready).opacity).toBe(1);
  });

  it('keeps the incomplete state visibly alive next to the busy one', () => {
    expect(OPACITY_INCOMPLETE).toBeGreaterThan(OPACITY_BUSY);
  });
});
