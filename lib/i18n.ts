import enJson from '../locales/en/common.json';
import zhJson from '../locales/zh/common.json';
import deJson from '../locales/de/common.json';
import allTranslations from '../locales/all_translations';

export type Translations = {
  app_name: string;
  auth: {
    login: string;
    register: string;
    email: string;
    password: string;
    new_password: string;
    confirm_password: string;
    display_name: string;
    logout: string;
    welcome: string;
    create_account: string;
    forgot_password: string;
    forgot_password_title: string;
    forgot_password_hint: string;
    send_reset_link: string;
    check_email_title: string;
    check_email_hint: string;
    reset_password_title: string;
    reset_password_hint: string;
    reset_password_submit: string;
    reset_code: string;
    back_to_login: string;
    identity_label: string;
    identity_hint?: string;
    identity_newcomer: string;
    identity_resident: string;
    identity_traveler: string;
    or: string;
    continue_with_google: string;
    continue_with_apple: string;
    errors: {
      email_taken: string;
      invalid_credentials: string;
      inactive: string;
      reset_email_unavailable: string;
      reset_token_invalid: string;
      reset_token_expired: string;
      password_mismatch: string;
      unknown: string;
    };
  };
  tasks: {
    title: string;
    available: string;
    in_progress: string;
    done: string;
    locked: string;
    start: string;
    complete: string;
    skip: string;
    type_main: string;
    type_side: string;
    section_progress: string;
    section_available: string;
    section_done: string;
    section_locked: string;
    section_from_plaza: string;
    empty_active: string;
    empty_no_template: string;
    empty_no_template_hint: string;
  };
  plaza: {
    title: string;
    detail_title: string;
    publish_note: string;
    tab_following: string;
    tab_explore: string;
    tab_nearby: string;
    category_for_you: string;
    composer_title: string;
    composer_hint: string;
    publish: string;
    publish_success: string;
    review_notice: string;
    helpful: string;
    comments: string;
    comments_show: string;
    comments_hide: string;
    comments_empty: string;
    comment_placeholder: string;
    comment_submit: string;
    add_to_tasks: string;
    action_candidates: string;
    empty: string;
    title_placeholder: string;
    body_placeholder: string;
    source_placeholder: string;
    photos: string;
    add_photo: string;
    photo_empty: string;
    photo_limit: string;
    photo_permission_denied: string;
    refresh_verification: string;
    verify_again: string;
    hide_post: string;
    report_post: string;
    report_confirm_body: string;
    moderation_review: string;
    personal_task_badge: string;
    type_experience: string;
    type_question: string;
    type_guide: string;
    type_warning: string;
    type_recommendation: string;
    verification_unverified: string;
    verification_community: string;
    verification_source_attached: string;
    verification_verified: string;
    verification_stale: string;
    verification_conflicting: string;
  };
  documents: {
    title: string;
    upload: string;
    scan: string;
    scan_permission_denied: string;
    scanning: string;
    analyzing: string;
    result: string;
    empty: string;
    untitled: string;
    ask_ai: string;
    ask_ai_hint: string;
    conversation_show: string;
    conversation_hide: string;
    chat_empty: string;
    question_placeholder: string;
    send_question: string;
    search_hint: string;
    search_used_badge: string;
    sources: string;
    ai_badge: string;
    you_badge: string;
    status: {
      pending: string;
      ocr_done: string;
      interpreted: string;
      failed: string;
    };
  };
  profile: {
    title: string;
    language: string;
    change_identity: string;
  };
  language: {
    select_title: string;
    search_placeholder: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    save: string;
    cancel: string;
    confirm: string;
    back: string;
  };
};

const translations: Record<string, Translations> = {
  en: enJson as Translations,
  zh: zhJson as Translations,
  de: deJson as Translations,
};

function deepMerge<T>(base: T, override: unknown): T {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return base;
  }

  const output: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = output[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      output[key] = deepMerge(baseValue, value);
    } else {
      output[key] = value;
    }
  }

  return output as T;
}

for (const [code, data] of Object.entries(allTranslations)) {
  if (!translations[code]) {
    translations[code] = deepMerge(enJson as Translations, data);
  }
}

export function getTranslations(langCode: string): Translations {
  return translations[langCode] ?? translations.en;
}

export function getAllTranslations(): Record<string, Translations> {
  return translations;
}
