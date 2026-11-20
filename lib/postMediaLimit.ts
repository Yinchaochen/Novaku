/**
 * How many pictures one Plaza post can carry: Instagram's carousel limit
 * (D-197), so a story told there in 20 slides fits here without dropping any.
 *
 * The backend refuses a 21st (MAX_POST_MEDIA_ITEMS in
 * novaku-backend/app/community/schemas.py); the two numbers move together.
 * Kept out of the Plaza screen so a test can read it without rendering the
 * whole composer.
 */
export const MAX_POST_MEDIA_ITEMS = 20;
